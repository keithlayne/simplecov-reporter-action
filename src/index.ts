import { getInput, setFailed } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { promises as fs } from 'node:fs';
import { assert } from './helpers';
import { marker, report } from './report';
import { diffCoverage, ResultSet, toCoverage } from './resultset';

const token = getInput('github-token');
const octokit = getOctokit(token);

const issue = {
  issue_number: context.issue.number,
  owner: context.issue.owner,
  repo: context.issue.repo,
};

const baselinePath = getInput('baseline-resultset');
const currentPath = getInput('current-resultset');

// Fail fast
const readCoverage = async (path: string) => {
  const json = await fs.readFile(path, 'utf-8');
  const resultSet = ResultSet.parse(JSON.parse(json));
  return toCoverage(resultSet);
};

async function* commentPages() {
  for (let page = 1; ; ++page) {
    const response = await octokit.rest.issues.listComments({ ...issue, page, per_page: 100 });
    const comments = response.data.filter((comment) => comment.body?.includes(marker));
    if (comments.length) yield comments;
    if (!response.headers.link?.includes(' rel="next"')) return;
  }
}

const deleteComments = async () => {
  const comments = [];
  for await (const page of commentPages()) comments.push(...page);
  return Promise.all(
    comments.map(({ id: comment_id }) =>
      octokit.rest.issues.deleteComment({ ...context.repo, comment_id }),
    ),
  );
};

const run = async () => {
  assert(context.eventName === 'pull_request', 'This action only makes sense for PRs');

  const [baseline, current] = await Promise.all([
    readCoverage(baselinePath),
    readCoverage(currentPath),
  ]);

  const diff = diffCoverage(baseline, current, process.env['GITHUB_WORKSPACE']);

  if (diff === undefined) return;

  await deleteComments();

  await octokit.rest.issues.createComment({ ...issue, body: report(diff) });
};

run().catch((error: unknown) => {
  console.error(error);
  setFailed(error instanceof Error ? error.message : String(error));
});

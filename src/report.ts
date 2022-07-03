import type { CoverageDiff, StatsDiff } from './resultset';

export const marker = 'f1bb63e2-a587-45a5-8f5d-c328b35eb289';

const header = (branches: boolean) =>
  `| |Lines|Lines Covered|Line Coverage|${
    branches ? 'Branches|Branches Covered|Branch Coverage|' : ''
  }\n|:-|:-:|:-:|:-:|${branches ? ':-:|:-:|:-:|' : ''}`;

const format = (value: number, unit: string, places: number) =>
  `${parseFloat(value.toFixed(places))}${unit}`;

const change = (baseline: number | undefined, current: number, unit = '', places = 0) => {
  //   const baselineFormatted = baseline === undefined ? '' : `${baseline.toFixed(places)}${unit}`;
  const delta = baseline === undefined ? current : current - baseline;

  const sign = Math.sign(delta) === 1 ? '+' : '';
  const deltaFormatted = delta === 0 ? '' : ` (${sign}${format(delta, unit, places)})`;

  return `${format(current, unit, places)}${deltaFormatted}`;
};

const percentage = (numerator: number, denominator: number) => {
  if (denominator === 0) return 100; // cheating
  return (100 * numerator) / denominator;
};

const row = (branches: boolean, label: string, { baseline, current }: StatsDiff) => {
  const lineColumns = [
    label,
    change(baseline?.lines, current.lines),
    change(baseline?.linesCovered, current.linesCovered),
    change(
      baseline === undefined ? undefined : percentage(baseline.linesCovered, baseline.lines),
      percentage(current.linesCovered, current.lines),
      '%',
      2,
    ),
  ];

  const branchColumns = branches
    ? [
        change(baseline?.branches, current.branches ?? 0),
        change(baseline?.branchesCovered, current.branchesCovered ?? 0),
        change(
          baseline === undefined
            ? undefined
            : percentage(baseline.branchesCovered ?? 0, baseline.branches ?? 0),
          percentage(current.branchesCovered ?? 0, current.branches ?? 0),
          '%',
          2,
        ),
      ]
    : [];

  const columns = [...lineColumns, ...branchColumns];

  return `|${columns.join('|')}|`;
};

const totals = ({ includesBranches, totalDiff }: CoverageDiff) =>
  `${header(includesBranches)}\n${row(includesBranches, '**Totals**', totalDiff)}`;

const files = ({ includesBranches, fileDiffs }: CoverageDiff) => {
  const rows = fileDiffs.map(({ filename, ...diff }) => row(includesBranches, filename, diff));
  return `${header(includesBranches)}\n${rows.join('\n')}`;
};

const comment = (totalTable: string, fileTable: string) => `
<!-- ${marker} marker so we can delete -->
## Ruby Test Coverage

${totalTable}

<details>
<summary>File Changes</summary>

${fileTable}

</details>
`;

export const report = (diff: CoverageDiff) => /**/ comment(totals(diff), files(diff));

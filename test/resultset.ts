import test = require('tape');
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ResultSet } from '../src/resultset';

const fixture = (filename: string): unknown =>
  JSON.parse(readFileSync(join(__dirname, 'fixtures', filename), 'utf-8'));

test('parsing', (t) => {
  t.plan(2);

  t.ok(ResultSet.safeParse(fixture('base.json')).success, 'base.json parses successfully');

  t.ok(
    ResultSet.safeParse(fixture('lines_only.json')).success,
    'lines_only.json parses successfully',
  );
});

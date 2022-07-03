import type { Branches, Entry, Lines, Result } from './resultset';

/**
 * Helper useful in filtering arrays.
 */
export const nonNullable = <T>(value: T): value is NonNullable<T> => value != null;

/**
 * Generic assertion function. Takes an optional error message.
 */
export function assert(condition: boolean, message = 'Assertion failed'): asserts condition {
  if (!condition) throw new Error(message);
}

/**
 * Combines two sets of line coverage. The SLOC must match between the two arrays.  The lengths of
 * the arrays much match, and if either of the corresponding entries is `null`, they both must be.
 * Otherwise the two sets are from different files or different revisions. If that's the case, we
 * throw and bail out.
 */
export const combineLines = (a: Lines, b: Lines): Lines => {
  assert(a.length === b.length, 'combineLines: array lengths differ');

  return a.map((lhs, index) => {
    const rhs = b[index];

    if (lhs === null && rhs === null) return null;
    if (lhs !== null && rhs !== null) return lhs + rhs;

    throw new Error('combineLines: difference in SLOC');
  });
};

/**
 * Combines two sets of branch coverage. If either input is undefined (representing a coverage run
 * without branch data), returns the other. Otherwise, the shapes of the two inputs must match
 * exactly, otherwise the inputs must come from different files or different revisions. If a
 * mismatch occurs, throw an error.
 *
 * TODO: Wow this is ugly. Maybe just some for loops would be better.
 * TODO: Verify assumptions about what valid inputs look like.
 */
export const combineBranches = (
  a: Branches | undefined,
  b: Branches | undefined,
): Branches | undefined => {
  if (a === undefined) return b;
  if (b === undefined) return a;

  const aEntries = Object.entries(a);
  const bEntries = Object.entries(b);
  assert(aEntries.length === bEntries.length, 'combineBranches: entries lengths differ');

  return Object.fromEntries(
    aEntries.map(([lBranch, lValues], index) => {
      const [rBranch, rValues] = bEntries[index];

      assert(lBranch === rBranch, 'combineBranches: mismatched branches');

      const lEntries = Object.entries(lValues);
      const rEntries = Object.entries(rValues);
      assert(aEntries.length === bEntries.length, 'combineBranches: branch entries lengths differ');

      const counts = Object.fromEntries(
        lEntries.map(([lKey, lCount], lIndex) => {
          const [rKey, rCount] = rEntries[lIndex];
          assert(lKey === rKey, 'combineKeyes: mismatched branch coverage');
          return [lKey, lCount + rCount];
        }),
      );

      return [lBranch, counts];
    }),
  );
};

/**
 *
 */
export const combineEntries = (a: Entry | undefined, b: Entry | undefined): Entry => {
  if (a === undefined) {
    assert(b !== undefined, 'combineEntries: both entries undefined');
    return b;
  }
  if (b === undefined) return a;

  return {
    branches: combineBranches(a.branches, b.branches),
    lines: combineLines(a.lines, b.lines),
  };
};

/**
 *
 */
export const combineResults = (a: Result, b: Result): Result => {
  const keys = new Set([...Object.keys(a.coverage), ...Object.keys(b.coverage)]);
  const coverage: Record<string, Entry> = {};

  for (const key of keys) {
    coverage[key] = combineEntries(a.coverage[key], b.coverage[key]);
  }

  return { coverage, timestamp: Math.max(a.timestamp, b.timestamp) };
};

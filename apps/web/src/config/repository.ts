/*
 * Where SquadUp's code lives. One place, so the footer, the open-source page
 * and anything later that links to the repository can't drift apart.
 */

export const REPOSITORY_URL = 'https://github.com/mayank-rawat98/squadup.in';

const BLOB = `${REPOSITORY_URL}/blob/dev`;

export const REPOSITORY_LINKS = {
  repository: REPOSITORY_URL,
  contributing: `${BLOB}/CONTRIBUTING.md`,
  roadmap: `${BLOB}/ROADMAP.md`,
  security: `${BLOB}/SECURITY.md`,
  license: `${BLOB}/LICENSE`,
  issues: `${REPOSITORY_URL}/issues`,
  newIssue: `${REPOSITORY_URL}/issues/new/choose`,
  goodFirstIssues: `${REPOSITORY_URL}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`,
} as const;

/** The site's own page about contributing. */
export const OPEN_SOURCE_PATH = '/open-source';

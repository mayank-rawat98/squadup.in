// Conventions: CONTRIBUTING.md §1 (types, scopes) and §5 (commits).
// Keep SCOPES in step with that list and with tools/sync-labels.sh.
const SCOPES = [
  // apps
  'api',
  'web',
  'ops',
  'e2e',
  // libs
  'ui',
  // domains
  'auth',
  'users',
  'staff',
  'audits',
  'notifications',
  'feature-flags',
  'blogs',
  'search',
  'storage',
  'mail',
  'arenas',
  'proctoring',
  'challenges',
  'board',
  'store',
  'seo',
  // infra
  'db',
  'docker',
  'caddy',
  'ci',
  'deploy',
  'monitoring',
  'devops',
  // other
  'tests',
  'deps',
  'repo',
];

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'security',
        'perf',
        'refactor',
        'chore',
        'build',
        'ci',
        'test',
        'docs',
        'style',
        'revert',
      ],
    ],
    // A warning, not an error: an unlisted scope is usually a new one that
    // CONTRIBUTING.md hasn't caught up with, and that shouldn't block a commit.
    'scope-enum': [1, 'always', SCOPES],
    'header-max-length': [2, 'always', 100],
  },
};

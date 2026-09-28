# Contributing to SquadUp

Thanks for helping out. This page covers how work is named and tracked, and what a change needs before it can merge.

The rule behind all of it: **one name follows a piece of work all the way through.** The issue, its branch, its commits and its pull request all use the same `type` and `scope`.

```
Issue   #12   feat(web): sign-in page
Branch        feat/12-sign-in-page
Commits       feat(web): the sign-in form sends a passkey challenge first
PR            feat(web): sign-in page   — body: "Closes #12"
```

## Before you start

- For anything bigger than a small fix, open an issue first so we can agree on the approach before you spend time on it.
- Follow the setup in the [README](README.md#getting-started). `npm install` also installs the git hooks (§5).
- Pick work from [ROADMAP.md](ROADMAP.md). Each milestone lists the tasks, the API endpoints to use and what "done" means.
- Read [CLAUDE.md](CLAUDE.md) for the engineering rules (structure, backend, frontend, testing). It is written for AI assistants, but the rules apply to everyone.

---

## 1. Issue titles

```
<type>(<scope>): <summary>
```

- **Summary** is lower-case after the colon, has no trailing period, and keeps the whole title under ~72 characters.
- **Features** name the outcome, in imperative mood: `feat(web): sign in with a passkey`.
- **Bugs** name the symptom the user sees, not the suspected cause: `fix(auth): verification link opens a 404`.
- **Chores and docs** name the change: `chore(docker): pin postgres image by digest`.
- **Several scopes** are comma-separated with no spaces, most affected first: `feat(api,web): email two-factor sign-in`. If you need more than three, use the domain scope or open an epic (§4).
- No ticket numbers, emoji or `[WIP]` in titles.

### Types

| Type       | Use for                                                                         | Label            |
| ---------- | ------------------------------------------------------------------------------- | ---------------- |
| `feat`     | New user-facing behaviour                                                       | `type: feature`  |
| `fix`      | Something that behaves wrongly                                                  | `type: bug`      |
| `security` | A vulnerability or hardening. Report real vulnerabilities privately first (§6). | `type: security` |
| `perf`     | Speed, size or resource use, with no change in behaviour                        | `type: chore`    |
| `refactor` | Restructuring with no change in behaviour                                       | `type: chore`    |
| `chore`    | Maintenance, dependencies, tooling                                              | `type: chore`    |
| `build`    | Build system, bundling, Docker images                                           | `type: chore`    |
| `ci`       | Workflows and pipelines                                                         | `type: chore`    |
| `test`     | Tests only                                                                      | `type: chore`    |
| `docs`     | Documentation only                                                              | `type: docs`     |
| `style`    | Formatting only (Prettier), with no change in behaviour                         | `type: chore`    |
| `revert`   | Reverting an earlier commit (commits only)                                      | —                |
| `epic`     | A body of work split into sub-issues (§4)                                       | `type: epic`     |

### Scopes

Use the smallest scope that is accurate. Prefer a **domain** scope when one feature spans several apps.

| Group   | Scopes                                                                                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apps    | `api`, `web`, `ops`, `e2e`                                                                                                                                                |
| Libs    | `ui`                                                                                                                                                                      |
| Domains | `auth`, `users`, `staff`, `audits`, `notifications`, `feature-flags`, `blogs`, `search`, `storage`, `mail`, `arenas`, `proctoring`, `challenges`, `board`, `store`, `seo` |
| Infra   | `db`, `docker`, `caddy`, `ci`, `deploy`, `monitoring`, `devops`                                                                                                           |
| Other   | `tests`, `deps`, `repo` (repo-wide tooling and docs)                                                                                                                      |

To add a scope, add it here, to `SCOPES` in `commitlint.config.cjs`, and as an `area:` label in `tools/sync-labels.sh`, all in the same PR.

---

## 2. Labels

Labels say **what kind of work** an issue is. Every issue has one `type:` label and at least one `area:` label.

| Group     | Labels                                    | Set by                                      |
| --------- | ----------------------------------------- | ------------------------------------------- |
| `type:`   | feature, bug, security, chore, docs, epic | The issue template, automatically           |
| `area:`   | One per scope in §1                       | The author, matching the scope in the title |
| `status:` | needs-info, needs-design, blocked         | Whoever finds the issue stuck               |

A `status:` label says **why** an issue can't move. Remove it once the issue is moving again. `good first issue` and `help wanted` are kept for newcomers.

Labels are defined in `tools/sync-labels.sh`. The script is idempotent and never deletes a label:

```sh
gh auth login               # once
bash tools/sync-labels.sh   # create or update every label
```

---

## 3. Writing the issue

Use a template (**New issue** on GitHub). Each one asks for what that kind of work needs:

- **Bug:** steps to reproduce, expected and actual behaviour, the environment, and logs or screenshots if you have them.
- **Feature:** the problem and who has it, the proposed outcome, and **acceptance criteria** as a checklist. The issue is done when every box is ticked.
- **Chore / docs:** what changes, why now, and the risks or rollback path.

Keep one concern per issue. If a bug turns out to have two causes, open a second issue and link it.

---

## 4. Epics

For work that spans several PRs, such as a ROADMAP.md milestone:

- Title: `epic(<scope>): <outcome>`, e.g. `epic(auth): authentication pages`.
- Use the **Epic** template and add each piece of work as a **sub-issue**.
- Sub-issues follow the normal naming rules. The epic closes when every sub-issue has closed.
- Epics do not get branches. Their sub-issues do.

---

## 5. Branches, commits and pull requests

**Branch:** `<type>/<issue#>-<kebab-slug>`, e.g. `feat/12-sign-in-page` or `fix/9-verification-link-prefix`. Keep the slug to 2–5 words. Every branch starts from an issue, so every branch has a number. Create it from an up-to-date `dev`, never from `main`, which deploys to production:

```sh
git fetch origin
git switch -c feat/12-sign-in-page origin/dev
```

Contributors without write access fork the repo and do the same on their fork.

**Commits** follow [Conventional Commits](https://www.conventionalcommits.org) with the same types and scopes as issues. Describe the change, or the defect it removes, in plain words:

```
fix(auth): the verification link includes the /auth prefix
feat(ui): an EmptyState molecule for lists with nothing in them
```

A breaking change adds `!` after the scope (`feat(api)!: …`) and a `BREAKING CHANGE:` footer.

**Git hooks** are installed by `npm install` (husky), with no extra step:

| Hook         | Runs                                                                                                           | Fix it with                  |
| ------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `commit-msg` | commitlint (`commitlint.config.cjs`): a known type, header ≤ 100 characters, and a warning for unlisted scopes | Rewrite the message          |
| `pre-commit` | lint-staged on staged files: `prettier --write`, then `eslint --fix`                                           | Fix what ESLint couldn't     |
| `pre-push`   | `npm run check:affected`: lint, typecheck, test and build for every project changed since `origin/dev`         | Run the same command locally |

Skip hooks with `--no-verify` only in an emergency, and say so in the PR. CI (`.github/workflows/ci.yml`) runs the full `lint test build typecheck` on every PR into `dev` or `main` and on every push to `dev`.

Formatting is Prettier (`.prettierrc`), and line endings are LF (`.gitattributes`). `npm run format` formats everything.

**Pull requests:**

- Feature branches merge into `dev`, and `dev` merges into `main`. Never commit directly to `main`.
- **Every PR is attached to its issue.** The title matches the issue title, and the body links the issue with `Closes #<n>`, or `Refs #<n>` if the PR only partly addresses it. No issue, no PR: open one first (§3).
- **Assign the PR to yourself.** You own it until it merges: answering review, fixing CI, keeping it up to date with `dev`.
- **Request a reviewer.** A PR merges only after a review from a maintainer.
- Fill in the PR template: what changed, why, how you verified it, screenshots for UI, and a rollback plan for DB or infra changes.
- Keep it focused: one concern per PR. Note unrelated clean-ups as follow-up issues instead of bundling them in.

Most of that is automatic:

| Rule                        | Done by                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Assigned to its author      | `.github/workflows/pr-hygiene.yml`, when the PR opens                                                                                            |
| Reviewer requested          | `.github/CODEOWNERS`: GitHub asks the code owners for a review when the PR opens                                                                 |
| Issue linked, title correct | `pr-hygiene.yml` fails the PR until the title is `type(scope): summary` and the body has `Closes #<n>` (it suggests the number from your branch) |

Maintainers opening PRs from the command line can do all three at once:

```sh
gh pr create --base dev --assignee @me --reviewer <reviewer> --title "feat(web): sign-in page" --body "Closes #12"
```

### Other conventions

- **Shared UI** goes in `libs/ui`, never copied between apps. See [libs/ui/README.md](libs/ui/README.md) and [docs/frontend-conventions.md](docs/frontend-conventions.md).
- **Styling** uses design tokens from `libs/ui/src/styles/index.css`. Never hardcode a hex value in a component.
- **Database changes** need a TypeORM migration. `synchronize` is off.
- **Secrets** never go in code, tests or commits. Add new variables to `.env.example` with a placeholder value and a comment.
- **Architecture decisions** that someone will later ask "why?" about get an ADR in [docs/adr/](docs/adr/).

---

## 6. Security issues

Do **not** open a public issue for an exploitable vulnerability. Follow [SECURITY.md](SECURITY.md) and report it privately through the repository's **Security → Report a vulnerability** tab. Hardening work with nothing exploitable can go through the normal `security` type.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).

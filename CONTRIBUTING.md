# Contributing to SquadUp

Thanks for helping out. This page covers what you need to get a change merged.

## Before you start

- For anything bigger than a small fix, open an issue first so we can agree on
  the approach before you spend time on it.
- Follow the setup in the [README](README.md#getting-started).
- Pick work from [ROADMAP.md](ROADMAP.md). Each milestone lists the tasks,
  the API endpoints to use and what "done" means.

## Workflow

1. Fork the repo and branch off `dev` (not `main`, which deploys to production).
2. Make your change. Keep it focused: one concern per pull request.
3. Make sure the checks pass for the projects you touched:

   ```sh
   npx nx run-many -t lint test typecheck
   ```

4. Open a pull request against `dev` and describe what changed and why.

## Conventions

- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org)
  with a scope: `feat(web): …`, `fix(api): …`, `chore(devops): …`.
- **Formatting** is Prettier. Run `npx prettier --write .` before committing.
- **Shared UI** goes in `libs/ui`, never copied between apps. Its rules are in
  [libs/ui/README.md](libs/ui/README.md).
- **Styling** uses design tokens from `libs/ui/src/styles/index.css`. Never
  hardcode a hex value in a component.
- **Database changes** need a TypeORM migration. `synchronize` is off.
- **Secrets** never go in code, tests or commits. Add new variables to
  `.env.example` with a placeholder value.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).

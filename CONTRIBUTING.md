# Contributing to HopeMind

Thank you for helping improve HopeMind.

## Local workflow

1. Create a focused branch from `main`.
2. Read the root [README](README.md) and configure the backend environment.
3. Keep changes scoped to one feature or bug.
4. Run the smallest relevant tests while developing.
5. Run the backend API tests and frontend production build before opening a pull request.
6. Describe behavior changes, validation performed, and any follow-up work.

## Code expectations

- Follow the existing React, TypeScript, Flask, and SQLAlchemy patterns.
- Keep API response normalization in service modules rather than scattering it across components.
- Preserve role-based access controls and explicit error handling.
- Do not log passwords, tokens, journal text, or other sensitive user content.
- Use accessible labels, keyboard focus states, and clear validation messages.
- Treat ML output as a non-diagnostic research estimate.
- Add or update tests for changed backend behavior.

## Pull requests

Pull requests should include:

- A concise explanation of the problem and solution.
- Screenshots or a short walkthrough for visible UI changes.
- Test commands and their results.
- Notes about database, environment, or migration changes.
- Confirmation that secrets and generated files are not included.

## Commit hygiene

Do not commit:

- `.env` files or credentials
- Virtual environments
- `node_modules`
- SQLite databases or user data
- Build output, caches, or editor metadata

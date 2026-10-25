# Security policy

## Scope

HopeMind is a demonstration project involving sensitive postpartum wellness data. It has not been certified for clinical, regulatory, or production use.

## Reporting a vulnerability

Please do not open a public issue for a vulnerability or include secrets, personal data, tokens, or exploit details in a public discussion. Contact the repository maintainers privately through the GitHub repository security contact if one is configured.

Include:

- A short description and impact.
- Reproduction steps or a minimal proof of concept.
- Affected route, component, or commit.
- Suggested remediation, if known.

Allow maintainers reasonable time to investigate before public disclosure.

## Security expectations for deployments

- Replace all development secrets.
- Use HTTPS and secure secret storage.
- Restrict CORS origins.
- Use a managed database with encryption and backups.
- Review authentication, authorization, audit logging, rate limiting, and session expiration.
- Do not send identifiable health information to third-party AI services without appropriate consent, agreements, and legal review.

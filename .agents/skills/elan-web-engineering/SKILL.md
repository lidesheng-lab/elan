---
name: desheng-elan-web-engineering
description: Build and maintain ÉLAN fashion site, account system, archive, search, media and mobile UX; not for unrelated websites.
---

# Workflow

Inspect repository and deployment before modifying anything. Write acceptance criteria and a rollback plan. Preserve search terms, filter state, scroll and up to 20 history entries as product requirements. Cache authorization safely with expiration and server enforcement; never treat client cache as permission. Validate image loading, downloads, rights and provenance; do not bypass third-party access controls or relay copyrighted media without permission. Test mobile gestures against browser navigation constraints, keyboard and screen readers, responsive layouts, 404s, latency and rate limits. Use WCAG 2.2 AA as target, never claim compliance without testing. Run automated tests, preview and only deploy with explicit authorization.

# Deliverable checklist
- Record inputs and assumptions.
- Produce a draft and inspect it against the user brief.
- Report tests actually run, unresolved risks and next actions.
- Never claim installation, deployment, validation or access that did not occur.

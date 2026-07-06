# Release Candidate Notes

## Scope

Initial public build of the local claim-checking agent skill.

## Verification

```bash
npm test
npm run check
npm run smoke
```

Recorded on 2026-07-06:

- `npm run release:check` passed locally, including static checks, 7 node:test cases, CLI help/version/fixture smoke, and package smoke.
- Added a GitHub Actions release gate for pull requests and pushes to `main` on Node.js 20 and 22.

## Known Limits

- Heuristic matching can miss paraphrases.
- Source bundles must be curated by the caller.
- The checker is a publication guardrail, not an authoritative fact checker.

## Classification

Ship as an MVP for local-first agent content review.

## PR Checklist

- Public repository created.
- Main branch contains the initial MVP.
- Release-candidate branch records verification commands.

# Release Candidate Notes

## Scope

Initial public build of the local claim-checking agent skill.

## Verification

```bash
npm test
npm run check
npm run smoke
```

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

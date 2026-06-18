# Orchestration Notes

## Inputs

- `draft`: local markdown or text path.
- `sources`: local JSON source bundle path.
- `format`: `markdown` or `json`.
- `failOn`: optional policy threshold.

## Recommended Run Step

```bash
node bin/agent-claim-check.js --draft draft.md --sources sources.json --format markdown --fail-on missing
```

## Stop Conditions

- Missing draft or source file.
- Invalid JSON source bundle.
- Any `missing` claim when publication is the next step.
- Any unverifiable claim about legal, financial, medical, or safety outcomes.

## External Actions

This skill does not perform external writes. Publication, ticket creation, CRM updates, or messaging must be separate approved actions.

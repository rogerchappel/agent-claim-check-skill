# Agent Claim Check Skill

## When To Use

Use this skill when an agent has drafted public-facing or decision-informing text from a finite set of sources, including launch posts, release notes, repo summaries, customer follow-ups, and video scripts.

## Required Inputs

- Draft markdown or plain text.
- Source bundle JSON with `id`, `title`, `text`, and optional `url`.
- Optional strictness policy such as `missing`, `weak`, or `unverifiable`.

## Side-Effect Boundaries

The skill is read-only. It may inspect local files and produce reports. It must not fetch live pages, publish content, create tickets, update CRM records, or modify source material.

## Approval Requirements

No approval is needed for local analysis. Explicit user approval is required before using report output to publish, message someone, file an issue, or write to an external system.

## Workflow

1. Collect the exact draft and source bundle.
2. Run the CLI with markdown output for human review.
3. Treat `missing` claims as blockers for publication.
4. Rewrite weak claims with narrower language or add source evidence.
5. Re-run the checker before handing off the draft.

## Examples

```bash
node bin/agent-claim-check.js --draft fixtures/draft.md --sources fixtures/sources.json --format markdown
node bin/agent-claim-check.js --draft fixtures/draft.md --sources fixtures/sources.json --format json --fail-on missing
```

## Validation

Run `npm test`, `npm run check`, and `npm run smoke`. For release readiness, include the generated report in the PR body or handoff notes.

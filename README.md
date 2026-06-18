# Agent Claim Check Skill

Agent Claim Check Skill is a local-first CLI and library for reviewing generated drafts against a supplied source bundle. It helps agents flag claims that are supported, weakly supported, missing evidence, or not suitable for automated verification.

## Quickstart

```bash
npm test
npm run smoke
node bin/agent-claim-check.js --draft fixtures/draft.md --sources fixtures/sources.json --format json
```

## Example

```bash
agent-claim-check \
  --draft launch-post.md \
  --sources repo-sources.json \
  --format markdown \
  --fail-on missing
```

Source bundles are JSON arrays:

```json
[
  {
    "id": "readme",
    "title": "README",
    "url": "https://example.com/repo",
    "text": "The project provides a local CLI and fixture-backed tests."
  }
]
```

## Limitations

The checker uses deterministic local heuristics rather than a live research model. It is designed for pre-publication triage and should be paired with human review for legal, medical, financial, or reputational claims.

## Safety Notes

The tool never fetches web pages, publishes content, creates issues, or writes to external accounts. It reads local draft/source files and prints reports. Any publication or external action should happen in a separate approved workflow.

## Project Status

Release-candidate MVP. See [docs/PRD.md](docs/PRD.md), [docs/TASKS.md](docs/TASKS.md), and [docs/ORCHESTRATION.md](docs/ORCHESTRATION.md).

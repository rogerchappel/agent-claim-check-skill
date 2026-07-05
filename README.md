# Agent Claim Check Skill

Agent Claim Check Skill is a local-first CLI and library for reviewing generated drafts against a supplied source bundle. It helps agents flag claims that are supported, weakly supported, missing evidence, or not suitable for automated verification.

## Quickstart

```bash
npm test
npm run smoke
node bin/agent-claim-check.js --help
node bin/agent-claim-check.js --draft fixtures/draft.md --sources fixtures/sources.json --format json
```

## Install

```bash
npm install -g agent-claim-check-skill
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

## Verify

Run the release-readiness check before promoting the package:

```bash
npm run check
npm test
npm run smoke
npm run package:smoke
npm run release:check
```

Pull requests and pushes to `main` run the same release gate in GitHub Actions
on Node.js 20 and 22.

## Package contents

`npm run package:smoke` performs a dry-run pack and asserts that the tarball
contains the CLI entrypoint, library source, `SKILL.md`, README, license, and
security policy, plus the fixture pair used by the documented smoke command.


## Verification

Run the local quality gates before opening a pull request:

```sh
npm run lint
npm test
npm run smoke
```

`npm run lint` is an alias for the repository static check so contributors can use the common npm workflow without guessing the project-specific command.

## Limitations

The checker uses deterministic local heuristics rather than a live research model. It is designed for pre-publication triage and should be paired with human review for legal, medical, financial, or reputational claims.

## Safety Notes

The tool never fetches web pages, publishes content, creates issues, or writes to external accounts. It reads local draft/source files and prints reports. Any publication or external action should happen in a separate approved workflow.

## Project Status

Release-candidate MVP. See [docs/PRD.md](docs/PRD.md), [docs/TASKS.md](docs/TASKS.md), and [docs/ORCHESTRATION.md](docs/ORCHESTRATION.md).

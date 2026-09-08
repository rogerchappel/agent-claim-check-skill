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
npm install --global github:rogerchappel/agent-claim-check-skill
```

The project is currently distributed from this GitHub repository and has not
yet been published to the npm registry.

## Example

```bash
agent-claim-check \
  --draft launch-post.md \
  --sources repo-sources.json \
  --format markdown \
  --fail-on missing
```

`--draft` and `--sources` are required. Each value-taking option (`--draft`,
`--sources`, `--format`, and `--fail-on`) may be supplied only once and must be
followed by a value, not another flag. `--help`/`-h` and `--version`/`-v` are
standalone commands and cannot be mixed with operational options. Invalid CLI
usage exits with status 1. `--format` accepts only `markdown` or `json`, while
`--fail-on` may be omitted or set to `weak`, `missing`, or `unverifiable`.
These option values are validated before either input file is read, and invalid
usage produces only an actionable error and usage text on stderr. A report
matching a valid selected `--fail-on` threshold exits with status 2.

Drafts may use ordinary Markdown prose, blockquoted prose, structural headings,
and ordered or unordered lists. Both ATX (`# Heading`) and Setext (underlined)
headings are excluded from claim candidates, including headings inside a
blockquote. LF, CRLF, and CR line endings have the same structural behavior.
Markdown tables, HTML comments, and link reference definitions are
also structural and excluded. Each list item is treated as a separate claim
candidate, including an item that continues across multiple lines, while prose
remains sentence-based. Complete CommonMark backtick and tilde fences are
excluded, including fences with info strings and delimiters of three or more
characters. The closing delimiter must use the same character and be at least
as long as the opener. Inline code spans may use any length of backtick
delimiter and can contain shorter backtick runs; only an equal-length run
closes the span. Unmatched backtick runs remain ordinary prose. Fenced,
indented, and inline code are excluded without suppressing adjacent prose or
list claims. If nothing remains to check
(for example, in a heading/code-only draft), the report contains an explicit
`C0` `unverifiable` result. Any configured `--fail-on` threshold then exits
with status 2 instead of silently passing automation.

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

Each array entry must be an object with a unique, non-blank string `id` and a
non-blank string `text`. Optional `title` and `url` fields must be strings when
present; an omitted or blank title defaults to the source ID, and an omitted or
blank URL defaults to an empty string. Titles and URLs are display metadata in
reported evidence; only passages from the required `text` field are scored as
claim evidence. Invalid entries are rejected before any
claims are classified, with the zero-based source index and field in the error.

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

`npm run package:smoke` creates a tarball in a disposable directory, asserts
that it contains the CLI entrypoint, library source, `SKILL.md`, README,
license, and security policy, then installs that exact tarball into a clean
disposable prefix and invokes the installed CLI with `--help` and `--version`.


## Verification

Run the local quality gates before opening a pull request:

```sh
npm run lint
npm test
npm run smoke
```

`npm run lint` is an alias for the repository static check so contributors can use the common npm workflow without guessing the project-specific command.

## Limitations

The checker uses deterministic local heuristics rather than a live research
model. It splits each source's `text` into sentence-like passages, ranks those passages
by lexical overlap, and uses matching negation polarity to break equal-score
ties. Remaining ties use source and passage text for deterministic evidence
ordering, independent of source bundle order. A higher-scoring passage still
wins even when its polarity differs, so the checker reports a contradiction
when no equally strong matching-polarity evidence exists. JSON evidence begins
with the selected passage in the `passage` field so callers can show what was
actually matched.

Within a sentence, polarity is taken from the clause that most closely matches
the claim terms. For example, `supports CSV, but does not support XML` supports
a positive CSV claim and contradicts a negative CSV claim; reversing those
clauses does not change the result.

This polarity check recognizes common English negators such as `not`, `never`,
`without`, and contractions ending in `n't`. It does not fully parse grammar, resolve
pronouns, understand double negatives, or determine whether similarly worded
statements have the same meaning. Sentence splitting is punctuation-based, so
abbreviations and unusual formatting can produce imperfect passages. Treat the
result as pre-publication triage and use human review for legal, medical,
financial, or reputational claims.

## Safety Notes

The tool never fetches web pages, publishes content, creates issues, or writes to external accounts. It reads local draft/source files and prints reports. Any publication or external action should happen in a separate approved workflow.

## Project Status

Release-candidate MVP. See [docs/PRD.md](docs/PRD.md), [docs/TASKS.md](docs/TASKS.md), and [docs/ORCHESTRATION.md](docs/ORCHESTRATION.md).

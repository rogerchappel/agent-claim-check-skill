# Changelog

## [Unreleased]

- Replace the unavailable npm-registry install command with the executable
  GitHub-source install and verify it in the package smoke test.
- Extract ordered and unordered Markdown list items as separate claim candidates.
- Add release-readiness checks for package metadata, pack contents, and CI verification.
- Prefer matching negation polarity when passages have equal lexical scores, with deterministic evidence ordering.
All notable changes to this project will be documented in this file.

## 0.1.0 release candidate - 2026-06-29

- Documented the initial local-first claim checking CLI and skill package.
- Included fixture-backed verification through `npm run release:check`.
- Prepared safety, packaging, and repository metadata for release review; this
  version has not been published to the npm registry.

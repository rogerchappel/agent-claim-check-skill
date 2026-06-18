# Product Requirements

## Goal

Provide a reusable local agent skill that checks generated content for unsupported claims before publication or stakeholder handoff.

## Non-Goals

- Live web research.
- Legal or compliance certification.
- Automatic publication.
- Replacing human editorial review.

## Core User Stories

- As a repo-to-content agent, I can verify that launch copy only claims what supplied repo sources support.
- As a maintainer, I can receive a compact report showing which sentences need evidence or weaker wording.
- As an orchestration agent, I can fail a run when missing evidence crosses a configured policy.

## Functional Requirements

- Read draft text from a local file.
- Read source evidence from JSON.
- Extract claim-like sentences from markdown.
- Classify each claim as `supported`, `weak`, `missing`, or `unverifiable`.
- Emit markdown and JSON reports.
- Support `--fail-on` thresholds for automation.

## Success Criteria

- Fixture smoke identifies unsupported claims in the sample draft.
- Tests cover extraction, classification, reporting, and CLI policy exits.
- Skill instructions make side-effect boundaries explicit.

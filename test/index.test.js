import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { checkDraft, extractClaims, renderMarkdown, shouldFail, tokenize } from "../src/index.js";

const sources = [
  {
    id: "readme",
    title: "README",
    text: "The project provides a local CLI and fixture-backed tests for reviewing generated launch material. It emits JSON and markdown reports."
  }
];

describe("claim extraction", () => {
  it("extracts prose claims and skips short fragments", () => {
    const claims = extractClaims("# Title\n\nShort.\n\nThe tool emits JSON and markdown reports for review.");
    assert.equal(claims.length, 1);
    assert.equal(claims[0].id, "C1");
  });
});

describe("tokenize", () => {
  it("normalizes text into useful terms", () => {
    assert.deepEqual(tokenize("The local CLI reviews launch material."), ["local", "reviews", "launch", "material"]);
  });

  it("normalizes hyphenated terms consistently", () => {
    assert.deepEqual(tokenize("source-backed and source‑backed"), ["source", "backed", "source", "backed"]);
  });
});

describe("checkDraft", () => {
  it("classifies supported and missing claims", () => {
    const report = checkDraft(
      "The project provides a local CLI and fixture-backed tests for reviewing generated launch material.\n\nIt publishes posts automatically to every network.",
      sources
    );
    assert.equal(report.summary.supported, 1);
    assert.equal(report.summary.missing, 1);
  });

  it("matches hyphenated claim terms to spaced source terms", () => {
    const report = checkDraft(
      "The checker provides source-backed evidence for every generated launch claim.",
      [{ id: "guide", text: "The checker provides source backed evidence for every generated launch claim." }]
    );
    assert.equal(report.summary.supported, 1);
  });

  it("supports fail-on thresholds", () => {
    const report = checkDraft("It publishes posts automatically to every network.", sources);
    assert.equal(shouldFail(report, "missing"), true);
    assert.equal(shouldFail(report, "unverifiable"), false);
  });

  it("renders markdown tables", () => {
    const report = checkDraft("The project emits JSON and markdown reports.", sources);
    assert.match(renderMarkdown(report), /Claim Check Report/);
    assert.match(renderMarkdown(report), /\| C1 \|/);
  });
});

describe("cli", () => {
  it("prints usage help", () => {
    const output = execFileSync("node", ["bin/agent-claim-check.js", "--help"], { encoding: "utf8" });
    assert.match(output, /Usage: agent-claim-check/);
    assert.match(output, /--draft <file>/);
    assert.match(output, /--sources <file>/);
  });

  it("prints the package version", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
    const output = execFileSync("node", ["bin/agent-claim-check.js", "--version"], { encoding: "utf8" });
    assert.equal(output.trim(), packageJson.version);
  });
});

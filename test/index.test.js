import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkDraft, extractClaims, readSources, renderMarkdown, shouldFail, tokenize } from "../src/index.js";

const sources = [
  {
    id: "readme",
    title: "README",
    text: "The project provides a local CLI and fixture-backed tests for reviewing generated launch material. It emits JSON and markdown reports."
  }
];

function withSourceBundle(value, callback) {
  const directory = mkdtempSync(join(tmpdir(), "agent-claim-check-test-"));
  const path = join(directory, "sources.json");
  writeFileSync(path, JSON.stringify(value));
  try {
    return callback(path);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("source bundles", () => {
  it("accepts the documented source shape and applies optional defaults", () => {
    withSourceBundle([{ id: "guide", text: "Supported evidence text." }], (path) => {
      assert.deepEqual(readSources(path), [{ id: "guide", title: "guide", url: "", text: "Supported evidence text." }]);
    });
  });

  for (const { value, message } of [
    { value: [null], message: "Source 0 must be an object." },
    { value: [[]], message: "Source 0 must be an object." },
    { value: [{}], message: "Source 0 field id must be a non-blank string." },
    { value: [{ id: " ", text: "evidence" }], message: "Source 0 field id must be a non-blank string." },
    { value: [{ id: "guide", text: { value: "evidence" } }], message: "Source 0 field text must be a non-blank string." },
    { value: [{ id: "guide", text: "evidence", title: 7 }], message: "Source 0 field title must be a string when provided." },
    { value: [{ id: "guide", text: "evidence", url: false }], message: "Source 0 field url must be a string when provided." },
    { value: [{ id: "dup", text: "first" }, { id: "dup", text: "second" }], message: 'Source 1 field id duplicates source id "dup".' }
  ]) {
    it(`rejects malformed input with ${message}`, () => {
      withSourceBundle(value, (path) => assert.throws(() => readSources(path), { message }));
    });
  }
});

describe("claim extraction", () => {
  it("extracts prose claims and skips short fragments", () => {
    const claims = extractClaims("# Title\n\nShort.\n\nThe tool emits JSON and markdown reports for review.");
    assert.equal(claims.length, 1);
    assert.equal(claims[0].id, "C1");
  });

  it("extracts consecutive unordered list items as separate claims", () => {
    const claims = extractClaims(`
- The tool emits detailed JSON reports for automated review
- The tool emits readable Markdown reports for human review
- The tool runs entirely locally without publishing draft content
`);

    assert.deepEqual(claims.map(({ text }) => text), [
      "The tool emits detailed JSON reports for automated review",
      "The tool emits readable Markdown reports for human review",
      "The tool runs entirely locally without publishing draft content"
    ]);
  });

  it("extracts ordered list items and preserves multiline item text", () => {
    const claims = extractClaims(`
1. The checker reads source bundles from local JSON files
   before it evaluates draft claims
2) The checker returns deterministic evidence ordering for
   repeatable automated review
`);

    assert.deepEqual(claims.map(({ text }) => text), [
      "The checker reads source bundles from local JSON files before it evaluates draft claims",
      "The checker returns deterministic evidence ordering for repeatable automated review"
    ]);
  });

  it("keeps prose and list claims separate while excluding code", () => {
    const claims = extractClaims(`
The checker reviews generated drafts against supplied source bundles.

- Inline \`npm run smoke\` commands are excluded from extracted claim text
- Fenced examples are also excluded from claim extraction

\`\`\`markdown
- This example list item must not become a claim candidate
\`\`\`

Reviewers receive a compact report for editorial triage.
`);

    assert.deepEqual(claims.map(({ text }) => text), [
      "The checker reviews generated drafts against supplied source bundles.",
      "Inline commands are excluded from extracted claim text",
      "Fenced examples are also excluded from claim extraction",
      "Reviewers receive a compact report for editorial triage."
    ]);
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

  it("does not support a claim that directly negates its evidence", () => {
    const report = checkDraft(
      "The project does not provide a local CLI or fixture-backed tests.",
      [{ id: "guide", text: "The project provides a local CLI and fixture-backed tests." }]
    );
    assert.equal(report.summary.supported, 0);
    assert.equal(report.results[0].status, "weak");
    assert.match(report.results[0].reason, /opposite negation polarity/);
  });

  it("supports a negated claim when its evidence has matching polarity", () => {
    const report = checkDraft(
      "The project does not publish posts automatically to every network.",
      [{ id: "guide", text: "The project does not publish posts automatically to every network." }]
    );
    assert.equal(report.summary.supported, 1);
  });

  it("ignores unrelated negation outside the matched passage", () => {
    const report = checkDraft(
      "The feature supports exports.",
      [{ id: "guide", text: "The feature supports exports. It does not publish files." }]
    );
    assert.equal(report.results[0].status, "supported");
    assert.equal(report.results[0].evidence[0].passage, "The feature supports exports.");
  });

  it("reports the locally matched negated passage", () => {
    const report = checkDraft(
      "The feature does not publish files.",
      [{ id: "guide", text: "The feature supports exports. The feature does not publish files." }]
    );
    assert.equal(report.results[0].status, "supported");
    assert.equal(report.results[0].evidence[0].passage, "The feature does not publish files.");
  });

  it("detects a polarity contradiction in the matched passage", () => {
    const report = checkDraft(
      "The feature does not support exports.",
      [{ id: "guide", text: "The feature supports exports. It does not publish files." }]
    );
    assert.equal(report.results[0].status, "weak");
    assert.match(report.results[0].reason, /matched passage.*opposite negation polarity/);
    assert.equal(report.results[0].evidence[0].passage, "The feature supports exports.");
  });

  it("selects the strongest local passage across sources", () => {
    const report = checkDraft(
      "The feature supports CSV exports.",
      [
        { id: "overview", text: "The feature supports reports. CSV files are not published." },
        { id: "exports", text: "The feature supports CSV exports. Publishing remains manual." }
      ]
    );
    assert.equal(report.results[0].status, "supported");
    assert.equal(report.results[0].evidence[0].id, "exports");
    assert.equal(report.results[0].evidence[0].passage, "The feature supports CSV exports.");
  });

  for (const claim of [
    "The feature does support CSV exports.",
    "The feature does not support CSV exports."
  ]) {
    it(`prefers matching polarity for tied passages regardless of source order: ${claim}`, () => {
      const positive = { id: "positive", text: "The feature does support CSV exports." };
      const negative = { id: "negative", text: "The feature does not support CSV exports." };
      const matchingId = claim.includes("does not") ? "negative" : "positive";

      for (const orderedSources of [[positive, negative], [negative, positive]]) {
        const report = checkDraft(claim, orderedSources);
        assert.equal(report.results[0].status, "supported");
        assert.equal(report.results[0].evidence[0].id, matchingId);
        assert.equal(report.results[0].evidence[0].passage, orderedSources.find(({ id }) => id === matchingId).text);
        assert.match(report.results[0].reason, /strong lexical overlap/);
      }
    });
  }

  it("retains contradiction reporting when an opposite-polarity passage scores higher", () => {
    const report = checkDraft(
      "The feature does not support CSV archive exports.",
      [
        { id: "matching", text: "The feature does not support CSV exports." },
        { id: "stronger", text: "The feature does support CSV archive exports." }
      ]
    );

    assert.equal(report.results[0].status, "weak");
    assert.equal(report.results[0].evidence[0].id, "stronger");
    assert.equal(report.results[0].evidence[0].passage, "The feature does support CSV archive exports.");
    assert.match(report.results[0].reason, /opposite negation polarity/);
  });

  it("orders otherwise tied evidence deterministically", () => {
    const alpha = { id: "alpha", text: "The feature supports CSV exports." };
    const zulu = { id: "zulu", text: "The feature supports CSV exports." };

    for (const orderedSources of [[zulu, alpha], [alpha, zulu]]) {
      const report = checkDraft("The feature supports CSV exports.", orderedSources);
      assert.deepEqual(report.results[0].evidence.map(({ id }) => id), ["alpha", "zulu"]);
    }
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
  function runCli(args) {
    return spawnSync("node", ["bin/agent-claim-check.js", ...args], { encoding: "utf8" });
  }

  for (const { sources: invalidSources, message } of [
    { sources: [{ id: "guide", text: { claim: "object evidence" } }], message: "Source 0 field text must be a non-blank string." },
    { sources: [{ id: "dup", text: "first evidence" }, { id: "dup", text: "second evidence" }], message: 'Source 1 field id duplicates source id "dup".' }
  ]) {
    it(`rejects an invalid bundle without emitting a report: ${message}`, () => {
      const directory = mkdtempSync(join(tmpdir(), "agent-claim-check-cli-"));
      const draft = join(directory, "draft.md");
      const sourcePath = join(directory, "sources.json");
      writeFileSync(draft, "The project provides object evidence for generated claims.");
      writeFileSync(sourcePath, JSON.stringify(invalidSources));
      try {
        const result = runCli(["--draft", draft, "--sources", sourcePath, "--format", "json"]);
        assert.equal(result.status, 1);
        assert.equal(result.stdout, "");
        assert.match(result.stderr, new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
        assert.doesNotMatch(result.stderr, /\[object Object\]/);
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    });
  }

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

  for (const option of ["--draft", "--sources", "--format", "--fail-on"]) {
    it(`rejects a repeated ${option} before reading files`, () => {
      const result = runCli([option, "does-not-exist", option, "another-value"]);

      assert.equal(result.status, 1);
      assert.match(result.stderr, new RegExp(`Option ${option} may only be specified once\\.`));
      assert.doesNotMatch(result.stderr, /ENOENT/);
    });

    it(`reports a missing value for ${option}`, () => {
      const result = runCli([option]);

      assert.equal(result.status, 1);
      assert.match(result.stderr, new RegExp(`Option ${option} requires a value\\.`));
    });

    it(`does not consume another flag as the value for ${option}`, () => {
      const result = runCli([option, "--help"]);

      assert.equal(result.status, 1);
      assert.match(result.stderr, new RegExp(`Option ${option} requires a value\\.`));
    });
  }

  for (const option of ["--help", "-h", "--version", "-v"]) {
    it(`requires ${option} to be used alone`, () => {
      const result = runCli([option, "--draft", "does-not-exist.md"]);

      assert.equal(result.status, 1);
      assert.match(result.stderr, new RegExp(`Option ${option} must be used alone\\.`));
      assert.doesNotMatch(result.stderr, /ENOENT/);
    });
  }

  for (const format of ["yaml", "MARKDOWN"]) {
    it(`rejects invalid --format value ${JSON.stringify(format)} before reading files`, () => {
      const result = runCli([
        "--draft", "does-not-exist.md",
        "--sources", "also-missing.json",
        "--format", format
      ]);

      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /Invalid value for --format: .*Expected markdown or json\./);
      assert.match(result.stderr, /Usage: agent-claim-check/);
      assert.doesNotMatch(result.stderr, /ENOENT/);
    });
  }

  for (const policy of ["typo", "supported", "WEAK"]) {
    it(`rejects invalid --fail-on value ${JSON.stringify(policy)} before reading files`, () => {
      const result = runCli([
        "--draft", "does-not-exist.md",
        "--sources", "also-missing.json",
        "--fail-on", policy
      ]);

      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /Invalid value for --fail-on: .*Expected weak, missing, or unverifiable\./);
      assert.match(result.stderr, /Usage: agent-claim-check/);
      assert.doesNotMatch(result.stderr, /ENOENT/);
    });
  }

  it("preserves exit code 2 for a matched fail-on threshold", () => {
    const result = runCli([
      "--draft", "fixtures/draft.md",
      "--sources", "fixtures/sources.json",
      "--fail-on", "missing"
    ]);

    assert.equal(result.status, 2);
    assert.equal(result.stderr, "");
  });
});

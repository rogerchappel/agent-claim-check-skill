import fs from "node:fs";

const STATUS_RANK = {
  supported: 0,
  weak: 1,
  missing: 2,
  unverifiable: 3
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "being",
  "between",
  "could",
  "every",
  "from",
  "have",
  "into",
  "that",
  "their",
  "there",
  "these",
  "this",
  "through",
  "with",
  "would",
  "your"
]);

export function readText(path) {
  return fs.readFileSync(path, "utf8");
}

export function readSources(path) {
  const parsed = JSON.parse(readText(path));
  if (!Array.isArray(parsed)) {
    throw new Error("Source bundle must be a JSON array.");
  }
  return parsed.map((source, index) => {
    if (!source || typeof source !== "object") {
      throw new Error(`Source ${index} must be an object.`);
    }
    if (!source.id || !source.text) {
      throw new Error(`Source ${index} must include id and text.`);
    }
    return {
      id: String(source.id),
      title: source.title ? String(source.title) : String(source.id),
      url: source.url ? String(source.url) : "",
      text: String(source.text)
    };
  });
}

export function extractClaims(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/^#+\s+/gm, "")
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length >= 24)
    .filter((sentence) => /[a-zA-Z]/.test(sentence))
    .map((text, index) => ({ id: `C${index + 1}`, text }));
}

export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[-\u2010-\u2015]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 3)
    .filter((token) => !STOP_WORDS.has(token));
}

export function classifyClaim(claim, sources) {
  const claimTokens = new Set(tokenize(claim.text));
  if (claimTokens.size === 0) {
    return {
      ...claim,
      status: "unverifiable",
      evidence: [],
      reason: "No stable claim terms were found.",
      suggestion: "Rewrite with concrete, source-backed details."
    };
  }

  const matches = sources
    .map((source) => {
      const sourceTokens = new Set(tokenize(`${source.title} ${source.text}`));
      const overlap = [...claimTokens].filter((token) => sourceTokens.has(token));
      return { source, overlap, score: overlap.length / claimTokens.size };
    })
    .filter((match) => match.overlap.length > 0)
    .sort((a, b) => b.score - a.score);

  const best = matches[0];
  if (!best) {
    return {
      ...claim,
      status: "missing",
      evidence: [],
      reason: "No overlapping evidence terms were found in the source bundle.",
      suggestion: "Remove the claim or add a source that directly supports it."
    };
  }

  const status = best.score >= 0.65 ? "supported" : best.score >= 0.35 ? "weak" : "missing";
  return {
    ...claim,
    status,
    evidence: matches.slice(0, 3).map((match) => ({
      id: match.source.id,
      title: match.source.title,
      url: match.source.url,
      overlap: match.overlap
    })),
    reason:
      status === "supported"
        ? "The claim has strong lexical overlap with supplied evidence."
        : status === "weak"
          ? "The claim has partial evidence but may need narrower wording."
          : "Only minimal evidence overlap was found.",
    suggestion:
      status === "supported"
        ? "Keep the claim with a citation."
        : status === "weak"
          ? "Narrow the wording or cite the exact supporting source."
          : "Add direct evidence or remove the claim."
  };
}

export function checkDraft(markdown, sources) {
  const claims = extractClaims(markdown);
  const results = claims.map((claim) => classifyClaim(claim, sources));
  const summary = results.reduce(
    (counts, result) => {
      counts[result.status] += 1;
      return counts;
    },
    { supported: 0, weak: 0, missing: 0, unverifiable: 0 }
  );
  return { summary, results };
}

export function shouldFail(report, failOn = "") {
  if (!failOn) return false;
  const threshold = STATUS_RANK[failOn];
  if (threshold === undefined) {
    throw new Error(`Unknown fail-on policy: ${failOn}`);
  }
  return report.results.some((result) => STATUS_RANK[result.status] >= threshold);
}

export function renderMarkdown(report) {
  const lines = [
    "# Claim Check Report",
    "",
    `Supported: ${report.summary.supported}`,
    `Weak: ${report.summary.weak}`,
    `Missing: ${report.summary.missing}`,
    `Unverifiable: ${report.summary.unverifiable}`,
    "",
    "| ID | Status | Claim | Evidence | Suggestion |",
    "| --- | --- | --- | --- | --- |"
  ];
  for (const result of report.results) {
    const evidence = result.evidence.length
      ? result.evidence.map((item) => item.id).join(", ")
      : "none";
    lines.push(
      `| ${result.id} | ${result.status} | ${escapeTable(result.text)} | ${escapeTable(evidence)} | ${escapeTable(result.suggestion)} |`
    );
  }
  return `${lines.join("\n")}\n`;
}

export function renderJson(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}

function escapeTable(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

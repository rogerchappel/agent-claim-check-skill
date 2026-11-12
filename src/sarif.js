const STATUS_LEVEL = { supported: "none", weak: "note", missing: "warning", unverifiable: "note" };

export function renderSarif(report, draftPath) {
  if (typeof draftPath !== "string" || draftPath.trim() === "") {
    throw new Error("SARIF output requires a non-blank draft path.");
  }
  const results = report.results.map((finding) => {
    const level = STATUS_LEVEL[finding.status];
    if (!level) return null;
    return {
      ruleId: `claim-check/${finding.status}`,
      level,
      message: { text: finding.text },
      locations: [{ physicalLocation: { artifactLocation: { uri: draftPath } } }],
      properties: {
        claimId: finding.id,
        status: finding.status,
        reason: finding.reason,
        suggestion: finding.suggestion,
        evidence: finding.evidence
      }
    };
  }).filter(Boolean);
  return `${JSON.stringify({
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [{
      tool: { driver: { name: "agent-claim-check", informationUri: "https://github.com/rogerchappel/agent-claim-check-skill", rules: Object.keys(STATUS_LEVEL).map((status) => ({ id: `claim-check/${status}`, shortDescription: { text: `Claim check: ${status}` } })) } },
      results
    }]
  }, null, 2)}\n`;
}

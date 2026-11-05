export interface Versions {
  tool_version: string; report_schema: string; policy_schema: string;
  ledger_schema: string;
  catalog_version: string;
  adapters: { name: string; adapter_version: string; verified_cli_range: string; checked_at: string }[];
}
export const versions: Versions = {
  tool_version: "0.1.0", report_schema: "1.0.0", policy_schema: "1.0.0",
  ledger_schema: "1.0.0",
  catalog_version: "0.1.0",
  adapters: ["claude-code", "codex", "copilot"].map(name => ({
    name, adapter_version: "1.0.0", verified_cli_range: "unverified",
    checked_at: "2026-11-04"
  }))
};

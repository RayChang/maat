import { MaatError } from "../errors";
export interface Args { command: string; positionals: string[]; flags: Record<string, string[]>; }
const grammar: Record<string, { flags: string[]; required?: string[]; min?: number; max?: number }> = {
  scan: { flags: ["cli","policy","evidence","snapshot","format"], max: 1 },
  evaluate: { flags: ["snapshot","policy","evidence"], required: ["snapshot"] },
  plan: { flags: ["report","target"], required: ["report"] },
  explain: { flags: [], min: 1, max: 1 },
  "catalog list": { flags: ["layer","tier"] }, "catalog validate": { flags: [] },
  "policy init": { flags: [] }, "policy validate": { flags: [], max: 1 },
  "attest template": { flags: ["check"], required: ["check"] },
  "flow open": { flags: ["plan","snapshot"], required: ["plan","snapshot"] },
  "flow approve": { flags: ["flow","scope","by"], required: ["flow","scope","by"] },
  "flow authorize": { flags: ["flow","command","by"], required: ["flow","command","by"] },
  "flow checkpoint": { flags: ["flow","action","phase","fingerprints"], required: ["flow","action","phase","fingerprints"] },
  "flow record": { flags: ["flow","kind","file"], required: ["flow","kind","file"] },
  "flow decide": { flags: ["flow","event","by"], required: ["flow","event"] },
  "flow status": { flags: ["flow"], required: ["flow"] },
  "flow list": { flags: [] }, version: { flags: [] }, update: { flags: [] }
};
const global = ["json","out","quiet","catalog","ledger"];
const boolean = new Set(["json","quiet"]);
const repeat = new Set(["cli","evidence","target"]);
const enums: Record<string,string[]> = {
  cli: ["claude-code","codex","copilot"], format: ["markdown","json","both"],
  tier: ["baseline","advanced"], layer: ["foundation","prompt","context","harness","loop","graph"],
  phase: ["before","after"], kind: ["change","evaluation"],
  event: ["accept","continue-fix","stop","handoff","resume"]
};
export function one(a: Args, key: string): string | undefined { return a.flags[key]?.[0]; }
export function parseArgs(argv: string[]): Args {
  const words = [...argv]; let command = words.shift() ?? "";
  if (["catalog","policy","attest","flow"].includes(command)) command += " " + (words.shift() ?? "");
  const spec = grammar[command];
  const bad = (m: string): never => { throw new MaatError(2, "usage_error: " + m); };
  if (!spec) bad("unknown command");
  const a: Args = { command, positionals: [], flags: {} };
  while (words.length) {
    const word = words.shift()!;
    if (!word.startsWith("-")) { a.positionals.push(word); continue; }
    if (!word.startsWith("--")) bad("unknown flag " + word);
    const key = word.slice(2);
    if (![...global,...spec.flags].includes(key)) bad("unknown flag " + word);
    if (a.flags[key] && !repeat.has(key)) bad("duplicate flag " + word);
    const value = boolean.has(key) ? "true" : words.shift();
    if (!value || value.startsWith("--")) bad("missing value for " + word);
    const v = value as string;
    if (enums[key] && !enums[key].includes(v)) bad("invalid value for " + word);
    (a.flags[key] ??= []).push(v);
  }
  if (a.positionals.length < (spec.min ?? 0) || a.positionals.length > (spec.max ?? 0))
    bad("wrong positional count");
  for (const k of spec.required ?? []) if (!one(a,k)) bad("missing --" + k);
  if (one(a,"json") && one(a,"format") && one(a,"format") !== "json") bad("--json conflicts with --format");
  return a;
}

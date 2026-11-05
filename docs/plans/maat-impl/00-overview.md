# maat v1 implementation specification

Implement the frozen v1 contracts through the tasks below. This delivery is documentation only: the specification author does not implement product files or commit. The future implementer executes tasks in numeric order from the existing repository root, on its existing branch; do not initialize a repository or push.

## Authority and scope

Read authority is: the 2026-11-04 CLI interface contract, the formal five-layer spec, the operation architecture, catalog 0.1.0, then the phase plan. Product choices are final. The source documents are listed below in authority order; task code contains every implementation instruction needed beyond this overview. Use only this overview and the current task while executing it.

1. [CLI interface contract](../../specs/2026-11-04-maat-cli-interface.md)
2. [Formal tool spec](../../specs/2026-11-03-five-layer-tool-spec.md)
3. [Operation architecture](../../specs/2026-11-04-toolkit-operation-architecture.md)
4. [Catalog 0.1.0](../../specs/2026-11-03-five-layer-catalog.md)
5. [Phase plan](../2026-11-03-five-layer-tool-implementation.md)

TypeScript runs on Bun >= 1.4.0. Runtime dependencies are zero; parsers are JSON.parse, Bun.YAML.parse and Bun.TOML.parse. The only development dependencies are typescript and @types/bun. Tests use bun test; type checking uses the package script that runs tsc --noEmit. package.json is named maat, private, with bin maat; installation is from GitHub without npm publication. Supported platforms are macOS and Linux. Every skill lives at skills/<name>/SKILL.md for npx skills add; there is one generic improvement skill.

Policy answers use only the interface contract fields: applicability, targets with baseline only, exemptions, and attestations. Agent assessments arrive through explicit evidence files. Paths and entrypoints come from observed evidence. Snapshots retain observations and fingerprints; the report has one documented schema at src/report/schema.json. Unsupported detectors return detector_unsupported and leave claims unknown.

## Architecture

The CLI parses one command and delegates to catalog, audit, inspection, planning, or flow components.
Discovery reads bounded repository files into transient memory; product-specific adapters and deterministic detectors create observations.
Snapshots retain paths, hashes, boundaries, versions, and observations without repository file bodies.
Evaluation combines those observations with explicit policy answers and evidence to derive scoped capabilities, item results, and layer states.
Reports keep machine observations, agent assessments, and user confirmations separate.
Planning renders supported text resources or asks for missing inputs and never applies a change.
The diagnosis and improvement skills guide an existing host, with modification approval separate from execution authorization.
A reducer and one guard module control flow transitions, while an external append-only JSONL ledger records events and replays persistent counts.
Neither diagnosis nor the controller launches target programs, hooks, models, or network requests.

```text
scan -> bounded discovery -> CLI adapters -> deterministic observations -> snapshot
                                                    |
evaluate(snapshot + policy + evidence) --------------+-> results -> report -> plan
                                                                          |
existing host + explicit approvals/authorizations -> guards + reducer -> external ledger
```

## Global constraints — verbatim interface contract

The following source-language quotations are preserved exactly; implementation instructions elsewhere are English.

本文件把正式 spec 第 7–9 節與運作架構第 5 節的邏輯契約，定成可實作的命令、旗標、檔案格式、版本與結束代碼。不改變產品邊界：診斷 CLI 唯讀、不呼叫模型、不執行專案程式、不寫入目標 repository；改善由既有 agent 在核准範圍內執行；流程控制核心依已核准的 A（reducer／guards／ledger）。

所有命令預設輸出到 stdout；診斷訊息到 stderr。沒有任何命令會寫入目標 repository，包含 `.maat/` 下的政策檔。

- 不讀 `~/.claude`、`~/.codex`、`~/.copilot` 等使用者層設定；需要時只收 `--evidence` 明確提供的去敏感片段。
- 不執行設定檔裡的命令、hook 或 script；設定內容是資料。
- 不聯網；不上傳程式碼；不寫入目標 repository；不建立或修改 ignore。
- `flow` 守門只保證工具自己不發出非法接受結果，不能阻止 host 繞過工具。報告如實標示未受控效果。

## Task execution

Each task has exactly three top-level sections: Files, Interfaces, Steps. As clarified by the user, the six required parts are the six checkbox steps under Steps. Step 1 gives the actual test; step 2 states its failure; step 3 gives complete implementation or a precisely anchored edit; step 4 reruns that test; step 5 type checks; step 6 gives the future commit message. New test directories and source directories in Files are created as needed before saving the shown files. No shell prompt, placeholder command, local output-filter dependency, unstated package, or implicit code generation is required.

Files in Interfaces already exist from earlier completed tasks. Consumes lists their exact exported names and signatures; Produces declares this task's public exports. Built-in Bun/Node APIs are not cross-task exports. A code block marked complete file replaces that path's contents; an explicitly marked insertion/append changes only the stated location. Resource recipes emit exactly the listed generated paths and contents. JSON text is valid YAML. Do not re-extract the catalog after machine-authoritative resources have intentionally changed.

All commands run from the repository root. Run the six steps in order. The source entry remains executable through Bun, and the final distribution task sets its executable bit for the package bin. Missing source modules normally cause the initial import failure. Regression assertions may accompany a task's genuine new failing requirement; they do not justify adding artificial product behavior.

## Task index and dependency order

The dependency schedule is serial: T01 first, then every task after its immediate predecessor. This preserves the required scaffold → catalog → models → policy → discovery → adapters → detectors → evaluation → report/templates/plan → controller → skills → E2E order. The explicit exported dependencies are listed in each task.

| ID | Task file | Depends on |
|---|---|---|
| T01 | [Scaffold Bun, TypeScript, and version](01-scaffold.md) | None |
| T02 | [Parse the complete command grammar and classify errors](02-arguments-errors.md) | T01 |
| T03 | [Extract the frozen catalog and load its data files](03-catalog-extraction.md) | T02 |
| T04 | [Validate catalog references and expose catalog validate](04-catalog-validation.md) | T03 |
| T05 | [Define domain models and canonical fingerprints](05-models-fingerprints.md) | T04 |
| T06 | [Validate policy input with a dependency-free schema walker](06-policy-validation.md) | T05 |
| T07 | [Validate attestations, assessments, and explicit external evidence](07-evidence-validity.md) | T06 |
| T08 | [Inventory files within a canonical repository boundary](08-bounded-discovery.md) | T07 |
| T09 | [Create and validate self-contained snapshots](09-snapshot-contract.md) | T08 |
| T10 | [Recognize Claude Code repository surfaces](10-claude-code-adapter.md) | T09 |
| T11 | [Recognize Codex repository surfaces and instruction shadowing](11-codex-adapter.md) | T10 |
| T12 | [Recognize GitHub Copilot CLI repository surfaces](12-copilot-adapter.md) | T11 |
| T13 | [Observe manifest entrypoints and exact documentation correspondence](13-entrypoint-detectors.md) | T12 |
| T14 | [Parse literal CI invocation and failure consequence independently](14-ci-detectors.md) | T13 |
| T15 | [Observe local links, imports, duplicate content, and context size](15-document-detectors.md) | T14 |
| T16 | [Observe bounded analysis, environment, and security configurations](16-configuration-signals.md) | T15 |
| T17 | [Run the detector registry and retain unsupported observations](17-detector-registry.md) | T16 |
| T18 | [Evaluate three-valued claims without overwriting evidence](18-truth-evidence-merge.md) | T17 |
| T19 | [Evaluate the nine registered capability predicates](19-capabilities.md) | T18 |
| T20 | [Foundation evidence claims](20-foundation-claim-contracts.md) | T19 |
| T21 | [Prompt evidence claims](21-prompt-claim-contracts.md) | T20 |
| T22 | [Context evidence claims](22-context-claim-contracts.md) | T21 |
| T23 | [Harness evidence claims](23-harness-claim-contracts.md) | T22 |
| T24 | [Loop evidence claims](24-loop-claim-contracts.md) | T23 |
| T25 | [Graph evidence claims](25-graph-claim-contracts.md) | T24 |
| T26 | [Aggregate item results and scoped prerequisites](26-item-results.md) | T25 |
| T27 | [Apply layer prerequisites and the catalog truth table](27-layer-states.md) | T26 |
| T28 | [Build JSON and summary-first Markdown from one evaluated report](28-report-rendering.md) | T27 |
| T29 | [Write explicit outputs only outside the target repository](29-safe-output.md) | T28 |
| T30 | [Ship versioned text resources and deterministic rendering](30-template-resources.md) | T29 |
| T31 | [Produce dependency-ordered plans with material and template binding](31-improvement-plan.md) | T30 |
| T32 | [Connect scan, snapshot reevaluation, and planning](32-scan-evaluate-plan-commands.md) | T31 |
| T33 | [Connect explain, catalog list, policy, attest, and version](33-inspect-policy-commands.md) | T32 |
| T34 | [Define the controller state, event envelopes, and checkpoint identity](34-flow-contracts.md) | T33 |
| T35 | [Guard approved versions, action scope, and separate execution authorization](35-flow-approval-guards.md) | T34 |
| T36 | [Guarded checkpoints and reducer transitions](36-flow-reducer.md) | T35 |
| T37 | [Persist atomic JSONL ledgers with exclusive locks and replay validation](37-append-only-ledger.md) | T36 |
| T38 | [Connect all flow commands and the final CLI error boundary](38-flow-cli-dispatch.md) | T37 |
| T39 | [Ship two maat skills and one generic verification skill](39-skills.md) | T38 |
| T40 | [Materialize exact repository fixtures and exercise all item outcomes](40-evidence-fixtures.md) | T39 |
| T41 | [Materialize controller fixtures and test both loops through the CLI](41-controller-e2e-fixtures.md) | T40 |
| T42 | [Report schema, packaging and supported platforms](42-schema-build-platform-matrix.md) | T41 |

## COVERAGE TABLE

Every command and flag in interface §3 has a row, including repeated scoped mentions of global flags. Positional path/id/file arguments are part of their command rows. All five exit codes, ten spec criteria, fifteen architecture cases, and seven guards are mapped. Filled rows: 96 / 96.

| Source requirement | Required behavior / interface | Task IDs |
|---|---|---|
| Interface §3 | `maat scan [path]` | T02, T08, T10, T11, T12, T17, T32, T42 |
| Interface §3 | `maat evaluate` | T02, T09, T18, T19, T26, T27, T28, T32, T42 |
| Interface §3 | `maat plan` | T02, T30, T31, T32 |
| Interface §3 | `maat explain <id>` | T02, T33 |
| Interface §3 | `maat catalog list` | T02, T03, T33 |
| Interface §3 | `maat catalog validate` | T02, T04, T33 |
| Interface §3 | `maat policy init` | T02, T06, T33 |
| Interface §3 | `maat policy validate [file]` | T02, T06, T07, T33 |
| Interface §3 | `maat attest template` | T02, T07, T26, T33 |
| Interface §3 | `maat flow <subcommand>` | T02, T34, T35, T36, T37, T38 |
| Interface §3 | `maat flow open` | T34, T37, T38, T41 |
| Interface §3 | `maat flow approve` | T34, T35, T36, T38, T41 |
| Interface §3 | `maat flow authorize` | T34, T35, T36, T38 |
| Interface §3 | `maat flow checkpoint` | T34, T36, T38, T41 |
| Interface §3 | `maat flow record` | T34, T36, T37, T38, T41 |
| Interface §3 | `maat flow decide` | T02, T35, T36, T38, T41 |
| Interface §3 | `maat flow status` | T37, T38, T41 |
| Interface §3 | `maat flow list` | T37, T38 |
| Interface §3 | `maat version` | T01, T02, T33, T38, T42 |
| Interface §3 global | --json | T02, T28, T29, T33, T38 |
| Interface §3 global | --out <dir> | T02, T29, T38, T42 |
| Interface §3 global | --quiet | T02, T29, T38 |
| Interface §3 global | --catalog <dir> | T02, T03, T04, T28, T32, T40 |
| Interface §3 global | --ledger <dir> | T02, T37, T38, T41 |
| Interface §3.1 scan | --cli <name> (repeatable) | T02, T10, T11, T12, T32, T40 |
| Interface §3.1 scan | --policy <file> | T02, T06, T07, T32 |
| Interface §3.1 scan | --evidence <file> (repeatable) | T02, T07, T18, T32, T40 |
| Interface §3.1 scan | --snapshot <file> | T02, T09, T29, T38, T42 |
| Interface §3.1 scan | --format markdown\|json\|both | T02, T28, T29, T38 |
| Interface §3.2 evaluate | --snapshot <file> | T02, T09, T32, T42 |
| Interface §3.2 evaluate | --policy <file> | T02, T06, T32 |
| Interface §3.2 evaluate | --evidence <file> (repeatable) | T02, T07, T18, T32 |
| Interface §3.3 plan | --report <file> | T02, T28, T31, T32 |
| Interface §3.3 plan | --target <layer\|check-id> (repeatable) | T02, T31, T32 |
| Interface §3.4 explain | --json | T02, T29, T33 |
| Interface §3.5 catalog list | --layer <layer> | T02, T33 |
| Interface §3.5 catalog list | --tier baseline\|advanced | T02, T33 |
| Interface §3.5 catalog list | --json | T02, T33 |
| Interface §3.6 attest template | --check <id> | T02, T26, T33 |
| Interface §3.7 flow open | --plan <file> | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow open | --snapshot <file> | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow approve | --flow <id> | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow approve | --scope <file> | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow approve | --by <who> | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow authorize | --flow <id> | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow authorize | --command <file> | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow authorize | --by <who> | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow checkpoint | --flow <id> | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow checkpoint | --action <aid> | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow checkpoint | --phase before\|after | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow checkpoint | --fingerprints <file> | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow record | --flow <id> | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow record | --kind change\|evaluation | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow record | --file <json> | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow decide | --flow <id> | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow decide | --event accept\|continue-fix\|stop\|handoff\|resume | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow decide | --by <who> (optional except resume) | T02, T34, T35, T36, T37, T38, T41 |
| Interface §3.7 flow status | --flow <id> | T02, T37, T38 |
| Interface §3.8 version | --json | T01, T02, T33, T38 |
| Interface §6 | Exit 0: Completed, including gaps/unknown/blocked | T02, T32, T38, T40 |
| Interface §6 | Exit 1: Unexpected internal or environment/IO error; lock contention is ledger_locked | T02, T37, T38 |
| Interface §6 | Exit 2: Unknown flags, missing arguments, mutually exclusive flags | T02, T38 |
| Interface §6 | Exit 3: Missing/unparseable/incompatible inputs; malformed events do not append | T02, T04, T06, T07, T09, T28, T31, T34, T37, T38 |
| Interface §6 | Exit 4: Well-formed flow event rejected by a guard; rejection persists | T02, T35, T36, T37, T38, T41 |
| Spec §11.1 | Deterministic machine observations; separate traceable external assessments | T05, T17, T18, T28 |
| Spec §11.2 | All 41 checks have nine contracts; preserve source mappings and inactive candidate policy | T03, T04, T20, T21, T22, T23, T24, T25, T27 |
| Spec §11.3 | Files, agent claims, and configured CI do not prove runtime enforcement | T10, T11, T12, T13, T14, T17, T18, T28, T40 |
| Spec §11.4 | Incomplete reads, unknown applicability, and expired confirmations cannot grant affected claims | T07, T08, T09, T18, T26, T27, T36, T40, T42 |
| Spec §11.5 | Human confirmations and agent assessments remain separate; agent opinions cannot grant requirements | T05, T07, T18, T19, T28, T40 |
| Spec §11.6 | Adapters specify product, version, and surface support without borrowing IDE/SDK/cloud semantics | T01, T10, T11, T12, T28, T40 |
| Spec §11.7 | Scoped prerequisite gaps, improvement actions and acceptance methods; no score or advancement percentage | T19, T26, T27, T28, T30, T31 |
| Spec §11.8 | Read-only diagnosis; scoped improvement approval; separate execution authorization; stale approval rejected | T08, T29, T35, T36, T38, T39, T41, T42 |
| Spec §11.9 | Consistent catalog/adapter/report versions and references; reject duplicate IDs and dependency cycles | T01, T03, T04, T07, T09, T28, T31, T35 |
| Spec §11.10 | Positive, negative, unknown, not-applicable, partial, conflict and configured-not-effective fixtures | T40, T41, T42 |
| Architecture §12 case 1 | Empty templates / isolated keywords cannot replace substantive content evidence | T07, T18, T30, T40 |
| Architecture §12 case 2 | Valid declaration evidence can satisfy declaration checks without runtime records | T13, T14, T18, T19, T40 |
| Architecture §12 case 3 | Agent claims without user materials cannot grant capabilities or human semantic conclusions | T18, T19, T40 |
| Architecture §12 case 4 | Valid human confirmation conflicts with static evidence: retain conflict and unknown | T18, T19, T40 |
| Architecture §12 case 5 | Draft or unapproved policy yields candidate diagnostics, not authoritative layer recognition | T27, T28, T40 |
| Architecture §12 case 6 | Identical inputs / rewritten candidates are not new evidence; stop unproductive repetition | T05, T18, T35, T36 |
| Architecture §12 case 7 | Expired evidence or changed dependencies/versions invalidate affected results | T07, T09, T18, T35, T36, T40 |
| Architecture §12 case 8 | Modification approval without execution authorization never permits commands | T35, T36, T38, T41 |
| Architecture §12 case 9 | Empty renders / changed templates or plans cannot use old approval | T30, T31, T35, T36 |
| Architecture §12 case 10 | Expected approved changes bind the new candidate without invalidating the whole plan | T34, T35, T36, T41 |
| Architecture §12 case 11 | Unexpected drift / scope expansion cannot receive lawful-flow acceptance | T35, T36, T38, T41 |
| Architecture §12 case 12 | Interruption, timeout, unknown external effects require reconciliation, never blind retry or pass | T34, T35, T36, T41 |
| Architecture §12 case 13 | Preserve unrelated dirty work; no clean-tree, reset, deletion, or rollback demand | T08, T36, T39, T40, T41, T42 |
| Architecture §12 case 14 | Host bypass is not prevented; flow violation and fresh content audit remain separate | T28, T36, T39, T41 |
| Architecture §12 case 15 | Duplicate / expired events persist rejection; counters survive restart and conflicts are explicit | T34, T35, T36, T37, T38, T41 |
| Architecture §8.3 G1 | Approved parseable policy and versions before formal acceptance | T04, T06, T07, T28, T31, T34, T35, T36 |
| Architecture §8.3 G2 | Consistent references, scope, fingerprints and current validity | T07, T09, T18, T19, T26, T31, T34, T35, T36 |
| Architecture §8.3 G3 | Modification and required role approvals cover the current action | T31, T34, T35, T36 |
| Architecture §8.3 G4 | Execution authorization covers command, inputs, permissions and effects | T34, T35, T36, T38 |
| Architecture §8.3 G5 | Before checkpoint matches current materials | T34, T35, T36, T41 |
| Architecture §8.3 G6 | Fixes remain within approved scope/conditions; no counter resets | T31, T34, T35, T36, T37 |
| Architecture §8.3 G7 | New relevant input or an explicit accountable resume event | T34, T35, T36, T37 |

## Exact fixture inventory

T40 lists every evidence repository path and supplies its exact UTF-8 contents through the shared fixture helper. T41 appends controller fixtures to that same helper and uses the same materialization command. T42 consumes these fixtures for schema, platform and read-only regression checks.

| Scenario | Exact fixture location / specification |
|---|---|
| Positive, negative, unknown, partial, not applicable | tests/fixtures/positive/, negative/, unknown/, partial/, not-applicable/; T40 lists every file |
| Empty fields and agent-only claims | tests/fixtures/empty-template/ and agent-only/ |
| Expired, dependency-changed, version-changed evidence | tests/fixtures/expired-evidence/, dependency-change/, version-change/ |
| Valid user versus static contradiction | tests/fixtures/user-machine-conflict/ |
| Configured invocation without effective execution | tests/fixtures/configured-not-effective/ |
| CLI separation and hostile inert settings | tests/fixtures/three-clis/ and malicious-config/ |
| Unapproved policy | tests/fixtures/unapproved-catalog/catalog/ with approved:false |
| Unrelated user changes | tests/fixtures/unrelated-dirty/ and flow-target/dirty.md |
| Explicit external confirmation | tests/fixtures/external-evidence/confirmation.evidence.yaml |
| Approved candidate and command not authorized | tests/fixtures/flow/base.plan.json, base.snapshot.json, before.json, after.json, change.json, evaluation.json, unauthorized-command.json |
| Stale approval and expiry | tests/fixtures/flow/stale-approval.json and expired-approval.json |
| Unexpected or out-of-scope drift | tests/fixtures/flow/drift-before.json and out-of-scope-after.json |
| Interruption / uncertain external result | tests/fixtures/flow/timeout.json; T36 defines exact stop/reconcile/resume event sequences |
| Duplicate/reworded inputs, counters, locks | T35–T38 contain exact event payloads and T41 uses isolated external ledgers; no target repo is changed |
| Empty render / altered plan | T30–T31 contain exact render values and mutation; T35 recomputes the signed plan |
| Host bypass followed by independent content review | tests/fixtures/flow/candidate.report.json plus T36 drift rejection and T41 independent content assertion |

## IMPLEMENTER DEFAULTS

These are implementation choices left open by the source contracts, not new product requirements. Each is marked inline in the cited task and may be vetoed by a human. Count: 38.

- D01 — T01: tool/catalog version starts at 0.1.0. report_schema, policy_schema and ledger_schema are 1.0.0; snapshots and plans use report_schema. Adapter metadata is unverified until exercised. Run from the existing repository root on Bun >=1.4.0. The package is maat, private; no remote or npm publication is assumed. The dependency installation command creates bun.lock with only the two allowed development dependencies.

- D02 — T02: long flags use separate values, repeated --cli/--evidence/--target preserve input order, scalar duplicates are usage errors, and --json conflicts with non-json --format. Global flags are accepted on every command. No --help, --fail-on, diff, or apply command is introduced. Empty target lists for plan select the three minimal startup checks specified by the improvement-plan task. policy validate without a file reads .maat/policy.yaml relative to the current directory. flow list uses the nearest ancestor with .git or .maat/policy.yaml; no marker means the current directory.

- D03 — T03: JSON text is used as YAML-compatible serialization for generated resources. The extractor preserves every source field and normalizes string attestations to objects. Source mappings and approval history remain in source_metadata. The initial template registry is empty. Item and rule-card paths are exactly the IDs from catalog §8 with .yaml appended; the executable extraction recipe below enumerates them without implementer choices. Do not rerun extraction after editing machine-authoritative files unless intentionally resynchronizing the approved source.

- D04 — T05: scope identity is exact equality of its populated fields. Canonical JSON sorts object keys and retains array order; repo_id is the first 16 SHA-256 hex characters of the canonical absolute root. Policy has only its contract fields. Machine observations, agent assessments from explicit evidence files, and user attestations stay separate. Assessments never become policy entries.

- D05 — T06: unknown top-level policy keys are rejected; the documented optional sections default to empty collections. An absent default policy is valid input for scan and emits policy_missing. An explicitly requested absent policy is input error 3. Schema major 1 is accepted; catalog major must match the loaded catalog. Expiry and fingerprint failures are diagnostics during scan/evaluate and make policy validate exit 3. `targets.<check>.baseline` answers that check's approved baseline condition; it does not change its catalog tier. Applicability is answered in applicability.<check-id>; applicability.<layer> is the fallback. Evidence carries its own scope. targets entries contain only baseline.

- D06 — T07: date-only expiries end at 00:00 UTC. Attestations require a substantive affirmative confirmation, cited quotations/line ranges, scope, material hashes, catalog/adapter bindings, confirmer and expiry. One explicitly provided evidence file contains one attestation or agent assessment plus source and provided_by. Agent assessments remain a separate internal collection and never become policy keys or grant claims.

- D07 — T08: inspect at most 10,000 regular text files, 1 MiB per file, and 32 MiB total, with deterministic lexical traversal. Exceeding a limit marks the inventory incomplete. Read UTF-8 files only. Skip node_modules, vendor, dist, build, credential-looking names, and hidden directories except the explicit repository configuration allowlist. Symlinks are inventoried as unknown and never followed, including internal symlinks; this conservative boundary still satisfies the no-escape rule. `.git/HEAD` may be read, while hooks, objects, config, and credential files are excluded. Include/exclude patterns use Bun.Glob.match only; no subprocess or ignore parser is used. Exclusions are recorded and never turn unknown into absence.

- D08 — T09: snapshots store material paths/digests and raw observations, never full file contents. ScanData holds bounded text only during scan. Evaluate consumes stored observations plus explicitly supplied policy and evidence; it never re-runs detectors or reads the target repository. Snapshot major-version, unique paths, digest syntax, and observation reference bindings are checked. The host is responsible for supplying the snapshot it intends to audit.

- D09 — T10: adapters advertise repository grammar support, with verified_cli_range set to unverified because no runtime version range has been exercised. checked_at records documentation review, not a product certification. Unknown keys, global settings, trust, and runtime loading remain explicit limits. Signals never become positive semantic claims. The same material can be read once and interpreted separately by each selected adapter.

- D10 — T13: the bounded declaration grammar is two nonempty lines in one Markdown material: Verification command: <literal command> and Verification purpose: <literal purpose>. Package scripts alone are candidates. bun run / npm run script references must match package.json; a complete missing binding is negative evidence. Entrypoints come from observed material, not extra policy fields. No invocation is executed.

- D11 — T14: inspect literal GitHub Actions run steps, with each workflow/job/step retained as a distinct scope. Match an explicit document entrypoint from the bounded declaration detector. Expressions, uses actions, wrappers and multiline shell remain unknown. continue-on-error:true is advisory. No additional policy selector fields are introduced.

- D12 — T15: support inline Markdown links with non-whitespace destinations and heading anchors formed from lowercase ASCII letters/digits plus hyphens. Reference-style links and non-ASCII anchor normalization remain unknown. Ignore remote URLs without requests. Resolve relative paths lexically against the document directory and require an inventoried destination. Imports support standalone @relative/path lines only. Imports and links yield facts about structure, not semantic authority or usefulness. Import cycles and escaping paths remain diagnostics.

- D13 — T19: capabilityRules supplies stable field names for catalog §7.1's existing all predicates. A user claim named in claim confirms all the listed declaration components only when its attestation is valid; the attestation question must request every component. These aliases are not new checks or thresholds. evaluation_config and run_record are optional evidence claims on harness.verification-wiring and do not add item requirements. Machine facts and user confirmations are any routes to the same claim; different scoped evidence never combines. The registry remains the authority: an unknown capability ID is an input error.

- D14 — T20: these claim identifiers name the existing foundation item requirements in catalog §8. They do not add mandatory project fields. Each listed claim is tested through unknown, valid human confirmation, and expired-confirmation routes.

- D15 — T21: these claim identifiers name the existing prompt item requirements in catalog §8. They do not add mandatory project fields. Each listed claim is tested through unknown, valid human confirmation, and expired-confirmation routes.

- D16 — T22: these claim identifiers name the existing context item requirements in catalog §8. They do not add mandatory project fields. Each listed claim is tested through unknown, valid human confirmation, and expired-confirmation routes.

- D17 — T23: these claim identifiers name the existing harness item requirements in catalog §8. They do not add mandatory project fields. Each listed claim is tested through unknown, valid human confirmation, and expired-confirmation routes.

- D18 — T24: these claim identifiers name the existing loop item requirements in catalog §8. They do not add mandatory project fields. Each listed claim is tested through unknown, valid human confirmation, and expired-confirmation routes.

- D19 — T25: these claim identifiers name the existing graph item requirements in catalog §8. They do not add mandatory project fields. Each listed claim is tested through unknown, valid human confirmation, and expired-confirmation routes.

- D20 — T26: itemClaims below names each existing catalog requirement; these names are wire identifiers for human evidence and are not additional thresholds. A claim covering multiple selected topics, controls, nodes, edges, or obligations means all selected members, as stated in the catalog. A reasoned non-applicable subcomponent (for example no build) is confirmed within its claim; it does not remove the whole item. Recovery is evaluated per explicit effect: local-source uses local, another named effect uses other_effects, and an unknown effect keeps both unknown. Valid exemptions are reported but do not manufacture verified or grant capabilities. baseline.when false remains an applicable advanced finding.

- D21 — T28: retain valid_until as the earliest evidence/applicability/exemption expiry, because the required report fields omit those dates and the accept guard must re-check current validity under architecture §8.3.

- D22 — T29: --quiet suppresses stdout only; stderr diagnostics remain visible. --out writes <kind>.json and <kind>.md for every command, where kind is its space-separated command name converted to hyphens, except scan/evaluate use report. --format both prints Markdown followed by a fenced JSON document. All destinations, including --snapshot and --ledger, are canonicalized before creating anything; repository descendants and aliases to them are rejected as input error 3. Atomic output replaces a destination symlink itself, never follows it. Existing non-target files are replaced only at explicitly selected output locations.

- D23 — T30: v1 ships six text templates and one generic rule-card skill (verify-before-done, delivered in the skills task). Other cards remain complete plan guidance from their extracted contracts; no card is silently treated as a runnable template. No executable hook template is claimed as verified. Rendering rejects missing, empty, extra, or unresolved inputs. All resource metadata and body bytes contribute to plan fingerprints. Template installation is not evidence of compliance.

- D24 — T31: no --target selects the three minimal startup checks (entrypoints, task specification, instruction authority), plus prerequisites of those checks. An explicit layer expands that layer's non-verified applicable/unknown items; an explicit check selects that check. Unknown commands, target locations, CLI choice, resource values, or distribution repository yield ask actions. Paths and known literals are taken only from observed evidence; missing values stay questions. No placeholder command is printed as executable. Every action needs plan approval; role_approval_required separately preserves the catalog's needs_approval. Each generated plan allows one initial attempt and zero automatic fixes; a human can approve an explicitly amended finite plan. Neither an action nor its template is applied.

- D25 — T31: ask actions permit clarification only. A host may record a manual evaluation proving the requested check already holds, with an authoritative report bound to the unchanged checkpoint. An ask action never permits a before checkpoint or a command; if edits are needed, regenerate the plan and open a new flow after answering the questions.

- D26 — T32: evaluate reads only the explicit snapshot, policy/evidence files, and catalog. It retains raw observations and never re-runs detectors or opens target materials. Without --policy it uses empty policy choices; new answers must be supplied explicitly. Scan loads only the named repository policy (or explicit --policy), runs bounded detectors once, and captures their observations. Windows marks platform_unknown and makes layer output non-authoritative.

- D27 — T33: explain accepts bare or @version check/card/template IDs and full capability IDs. Ambiguous namespaces are an input error. policy init prints a commented YAML-compatible JSON skeleton. attest template emits null/empty values that cannot accidentally validate, plus the exact question and accepted claim names; it never writes. policy validate diagnoses stale attestations/exemptions using bounded repository discovery, with no command execution. A missing file or invalid schema is exit 3. Inspector Markdown is a fenced structured contract, preserving all source fields.

- D28 — T34: controller states and event fields are fixed by the types below. File-backed events require id, expected_seq, expires_at, and payload; the CLI supplies type/at/by where a flag exists. Timestamps use UTC ISO strings. A checkpoint is a sorted set of unique path/digest pairs; it includes relevant dependencies, policy, and template/catalog references supplied by the host. Identical digests at different paths are distinct. The flow reconstructs current state, counts, and unknown effects from events; it never executes an action. Controller identity fields are host-provided, not authenticated.

- D29 — T35: the reducer recomputes the complete signed plan, including filled template bodies, on every event; it compares tool/schema/adapter versions and current registered template versions. Input fingerprints and any script fingerprint must still match the current checkpoint. An ask approval grants clarification only.

- D30 — T36: an after checkpoint with reconcile:true, an accountable by field, and explicit unknown_effects reconciles stopped/interrupted work without replaying it; it clears approval/authorization and requires new approval before resume. The base history and attempt counters remain intact. Unknown external effects force handoff.

- D31 — T36: reconciliation can confirm only the unchanged current checkpoint and clears approval/authorization without resetting counters. Any changed bytes produce checkpoint_drift, retain the old base, and require a newly presented plan and a new flow; the old flow can be stopped or handed off but cannot adopt bypassing edits.

- D32 — T36: malformed event data throws code 3 before sequence allocation; only well-formed guard rejections append ledger rows. An approved ask can be resolved by a manual, authoritative pass on the unchanged candidate; commands and edits require a new concrete plan. Accept rechecks the report's validity deadline and bound versions.

- D33 — T37: directory precedence is --ledger, MAAT_STATE_DIR, XDG_STATE_HOME/maat/<repo-id>, then the macOS or Linux user-state fallback. Overrides select the exact directory, always outside the target. Generated flow IDs prefix repo-id so lookup does not depend on cwd. One JSONL file records the opening plan/base and later events with sequence, time, before/after state names, acceptance, and reason. Replay reconstructs counts and current state; rows do not duplicate full state and do not use a hash chain. Updates preserve old bytes, append via temporary file plus rename, and hold an exclusive lock file created atomically with its owner's pid and hostname. A lock whose owner is on this hostname and whose pid is no longer alive is cleared automatically once, then acquisition is retried; any other lock (live pid, another hostname, unreadable content) is environment error 1, ledger_locked.

- D34 — T38: approve/authorize/checkpoint/record input files use {id, expected_seq, expires_at, by?, payload}. The CLI supplies the event type and current timestamp; --by overrides the envelope actor for approve/authorize. checkpoint requires by in its envelope; record may use payload.by or payload.executed_by. decide creates an immediate event with a 60-second envelope lifetime (not a workflow budget); resume requires --by. status includes remaining fixes, pending checkpoints, and unknown effects. --ledger wins over all environment defaults. v1 has no executor hidden behind flow record. All command handlers return data to one output boundary.

- D35 — T38: flow list finds the nearest ancestor containing .git or .maat/policy.yaml, falling back to cwd; flow IDs locate status/mutations even from another repository or directory. It skips ledgers that fail to read with an input error, reports each as a ledger_skipped diagnostic on stderr, and still exits 0.

- D36 — T39: SKILL.md frontmatter contains name and description only. Ship exactly one diagnosis skill, one improvement skill, and one reusable verify-before-done skill. All three use the standard skills/<name>/SKILL.md layout and are installed by npx skills add after the GitHub owner/repository is known. Project-specific commands, paths, and CLI choices are resolved at use time from the project policy/guidance or the user. The source text below is the complete delivery, not a prompt for the implementer to improvise.

- D37 — T40: fixture time is 2026-11-04T12:00:00Z and fixture expiry is 2027-02-01. Files below are UTF-8 with the exact strings produced by fixtureFiles; JSON.stringify uses two-space indentation and a final newline. SHA-256 values are computed from the shown exact material bytes, not hand-entered. The materialization script creates tests/fixtures/<name>/ and performs no scan. Fixtures include explicit scoped answers; omitted choices stay unknown. Tests never execute fixture scripts.

- D38 — T42: the source bin supports GitHub installation without an installation hook, and bun run build produces dist/cli.js. The only static schema is src/report/schema.json, consumed by report-fixture tests. macOS/Linux CI uses non-root runners. Read-only E2E assertions are regression checks alongside the genuine distribution/schema red cycle.

## OPEN QUESTIONS

Both questions below were resolved by the user on 2026-11-05; no coverage row is unassigned.

- RESOLVED 2026-11-05: GitHub repository is `RayChang/maat` (private). Install with `bunx github:RayChang/maat`; skills with `npx skills add RayChang/maat`. The remote is created only when the user approves the push.
- RESOLVED 2026-11-05 (user chose A): v1 adapters record `verified_cli_range: unverified` and `checked_at` = the official-document review date; no exercised version range is claimed. A range is added only after each CLI is run live once. No additional executor or certification subsystem is included.


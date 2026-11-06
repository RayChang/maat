# maat v2 implementation plan

Revision: r4, agreed by planner and critic on 2026-11-05 (see DEBATE-LOG.md). Execute V01, V02, V03 in order from the repository root on the v2 implementation branch. This delivery is documentation only; the planner does not implement product files or commit.

## Owner rule (binding)

Over-design is forbidden. v2 supports only what each detector contract requires, with the smallest change that turns `detector_unsupported` into a real observation, preferring wiring or finishing v1 code over new modules. Every other idea is in OPEN QUESTIONS, not in the tasks.

## Authority and scope

Authority order is unchanged from v1: [CLI interface contract](../../specs/2026-11-04-maat-cli-interface.md), [formal tool spec](../../specs/2026-11-03-five-layer-tool-spec.md), [operation architecture](../../specs/2026-11-04-toolkit-operation-architecture.md), [catalog 0.1.0](../../specs/2026-11-03-five-layer-catalog.md) (frozen), then the [v1 plan](../maat-impl/00-overview.md) and its defaults D01–D38, which remain in force.

v2 changes no contract, catalog file, policy field, report field, schema, adapter file or adapter version. It edits one product module (`src/detectors/index.ts`) and the tool version. Diagnosis stays read-only: no project code execution, no network, no model calls, no target writes, no user-level settings. Zero runtime dependencies; TypeScript on Bun >= 1.4.0; `bun test`; `bun run typecheck` (`tsc --noEmit`); macOS and Linux.

## Why the brief's list had 25 entries

The brief's list came from `bun src/cli/index.ts scan tests/fixtures/positive --cli claude-code`. That fixture holds two files (`tasks/login.md`, `.maat/policy.yaml`). `runDetectors` emits `detector_unsupported` for every catalog detector that produced no observation (`src/detectors/index.ts:24-26`), so the list mixes "no matching input in this repository" with "no producer exists". This contradicts T17, which reserves `detector_unsupported` for "grammars outside the v1 bounded subset" (`docs/plans/maat-impl/17-detector-registry.md:3`).

Measured across all 18 v1 fixtures scanned with all three CLIs: 13 detectors are never emitted. 10 have no producer; `analysis.config@1`, `evaluation.model-gate@1` and `security.config-signals@1` have producers but no fixture input.

A second v1 defect: the hook-to-entrypoint trigger fact can never be produced, because every declared entrypoint has scope `{}` (`src/detectors/entrypoints.ts:10`) while the match requires `e.scope.cli===a.name` (`src/detectors/index.ts:16`). No v1 fixture exercises it, so no v1 test notices.

## Detector status (the 25 from the brief)

Class: (a) implemented but not registered; (b) a producer emits a real observation for its v1 bounded grammar when input exists; (c) no producer. There is no (a): every producer is called from `runDetectors` directly or through adapter observations (`src/detectors/index.ts:10-11`). "Partial" marks a (b) producer covering only part of its catalog §10.1 row; those gaps are OQ-3.

| Detector | Class | v1 evidence | After v2 |
|---|---|---|---|
| analysis.config@1 | b, partial | `src/detectors/configuration.ts:13-21` | supported (V01 status) |
| ci-config-found@1 | b, partial: no jobs or trigger kinds | `src/detectors/ci.ts:6-9` | supported (V01 status) |
| ci.failure-consequence@1 | b | `src/detectors/ci.ts:22-28` | supported (V01 status) |
| ci.step-invokes-entrypoint@1 | b | `src/detectors/ci.ts:17-26` | supported (V01 status) |
| environment.declarations@1 | b, partial: no lockfiles | `src/detectors/configuration.ts:6-12` | supported (V01 status) |
| evaluation.model-gate@1 | b, Claude only | `src/adapters/claude-code/index.ts:26-32` | supported (V01 status) |
| hooks.invokes-entrypoint@1 | b, correspondence unreachable | `src/adapters/claude-code/index.ts:30`; `src/adapters/copilot/index.ts:20-26`; `src/detectors/index.ts:16` | supported; correspondence repaired (V02) |
| instruction-file-found@1 | b, Claude and Copilot only | `src/adapters/claude-code/index.ts:15-16`; `src/adapters/copilot/index.ts:9-10` | supported (V01 status) |
| instructions.precedence-model@1 | b, Codex only | `src/adapters/codex/index.ts:8-13` | supported (V01 status) |
| instructions.scoping@1 | c | none | unsupported (OQ-6) |
| instructions.verify-entrypoint@1 | b | `src/detectors/entrypoints.ts:38-41` | supported (V01 status) |
| loop.bounds@1 | c | none | unsupported (OQ-10) |
| loop.routing-declared@1 | c | none | unsupported (OQ-4) |
| loop.self-declared@1 | c | none | unsupported (OQ-7) |
| loop.stop-gate.command@1 | b, event only | `src/detectors/index.ts:21-22` | supported (V01 status) |
| loop.stop-gate.model@1 | c | none; Claude prompt/agent Stop hooks reach the loop and are skipped at `src/detectors/index.ts:15` | supported (V02) |
| loop.stop-hook-active-checked@1 | c | none | supported, positive-only weak signal (V02) |
| loop.trigger@1 | c | none | unsupported (OQ-10) |
| manifest.verify-entrypoint@1 | b, partial: package.json only | `src/detectors/entrypoints.ts:17-22` | supported (V01 status) |
| permissions.declarations@1 | b, Claude and Codex only | `src/adapters/claude-code/index.ts:37-45`; `src/adapters/codex/index.ts:15-23` | supported (V01 status) |
| policy.human-evaluation@1 | c | none | unsupported (OQ-4) |
| policy.verify-entrypoint@1 | b, reads the D10 Markdown declaration | `src/detectors/entrypoints.ts:37` | supported (V01 status); provenance OQ-9 |
| recovery.local-plan@1 | c | none | unsupported (OQ-5) |
| security.config-signals@1 | b, partial: Dependabot only | `src/detectors/configuration.ts:22-27` | supported (V01 status) |
| tests.structure@1 | c (stub) | `src/detectors/configuration.ts:29-30` | unsupported (OQ-8) |

"V01 status" means the producer is unchanged; V01 only stops the fallback from calling it unsupported when nothing matched.

Result, checked by replaying V01–V03 on a scratch copy of v1: the brief's command now reports 8 `detector_unsupported` entries instead of 25; all 82 tests and `tsc --noEmit` pass.

## Stays unsupported after v2 (eight)

Each keeps its human attestation route; an unsupported detector does not block it (catalog 8.0, "不支持的 detector 不否定人工途徑").

- `instructions.scoping@1`: every candidate grammar (Copilot `applyTo`, Claude rules paths, skill descriptions) is an adapter grammar change needing a CLI documentation review; v1 T12 reads path-specific files as candidates only (`docs/plans/maat-impl/12-copilot-adapter.md:3`).
- `loop.bounds@1` and `loop.trigger@1`: both require association with a designated loop (catalog §10.1 rows, `catalog:2583-2584`). The only association source is the policy `loops[].scope`; reading policy inside a detector would bind observations to the scan-time policy while `evaluate` may supply another (`src/cli/audit.ts:41-53`; D26). Generic CI events and job timeouts are not loop observations.
- `loop.routing-declared@1`: needs structured policy or a finite branch grammar; the policy has no routing field (interface §4.1), and catalog 8.4 forbids deriving routing from signals.
- `loop.self-declared@1`: no contract defines a bounded completion-comparison grammar; a regex over shell text would be an invented heuristic.
- `policy.human-evaluation@1`: needs a structured reviewer, criteria and result location; no policy field or declaration grammar exists.
- `recovery.local-plan@1`: needs an explicit recovery declaration to correspond with; Git alone is unknown (catalog 8.21).
- `tests.structure@1`: no zero-dependency parser establishes case structure and assertions; same reason as v1 T16 (`docs/plans/maat-impl/16-configuration-signals.md:3`).

## Decisions

- New facts from V02's two Stop detectors are `signal()` facts (status unknown, `signal: true`) and cannot prove a claim (`src/evaluate/truth.ts:14`; D09). The repaired correspondence restores the non-signal `trigger` fact that T17 specifies, for Claude `Stop` and Copilot `agentStop` hooks; it can turn the `trigger` claim of `harness.verification-wiring` to `holds` at scope `{cli}`.
- Detectors stay policy-independent, so snapshots evaluated under a different policy keep valid observations.
- No adapter output changes, so adapter versions stay 1.0.0. Machine observations change for the same repository and policy, so `tool_version` moves to 0.2.0 (spec §11.1; interface §2).

## Task execution

Same rules as v1 (`docs/plans/maat-impl/00-overview.md`, Task execution): each task has Files, Interfaces, Steps; the six checkbox steps are the failing test, its expected failure, complete file or exactly anchored edit, the passing rerun, `bun run typecheck`, and the exact commit message. Files in Interfaces already exist. A block marked complete file replaces that path; an anchored edit changes only the quoted text. Code blocks contain no `\u` escape sequences, because Edit/Write tools decode them. Run every command from the repository root.

| ID | Task file | Depends on |
|---|---|---|
| V01 | [Report unsupported only for detectors without a producer](01-registry-support-status.md) | v1 merged |
| V02 | [Wire hook entrypoint triggers and Claude Stop-gate signals](02-hook-wiring-and-stop-gates.md) | V01 |
| V03 | [Bump the tool version for changed observations](03-version-identity.md) | V02 |

## IMPLEMENTER DEFAULTS

Implementation choices the contracts leave open; each may be vetoed by the owner. Count: 4.

- VD01 — V01: the supported set is an explicit list in `src/detectors/index.ts`. IDs outside it, including IDs from an overriding `--catalog`, stay `detector_unsupported`. A supported ID with no output gets one observation with no facts, no diagnostics and the limit `No supported observation produced; input absent, outside the supported grammar, for an unselected CLI, or unreadable`. No new diagnostic code is introduced.
- VD02 — V02: a literal command hook on an adapter-recognized event, equal to a declared entrypoint command, yields the `trigger` fact at the hook observation scope (`{cli}`), with evidence = hook file + declaring document + bound manifest. The v1 adapters accept any event key, so recognized events are those v1 already names: Claude `Stop` and Copilot `agentStop` (T17). Other events (for example `PostToolUse`) yield no trigger fact until OQ-6. Whether the entrypoint's script exists stays with the `verify.entrypoint-declared@1` prerequisite (`src/evaluate/items.ts:57-59`); T17: equality "establishes only a declared trigger". This is an interpretation of T17's "exact literal command equality within the selected CLI", accepted by the owner: "within the selected CLI" refers to the CLI that owns the hook; the declaring document is not CLI-specific (D10), so a command declared in e.g. `AGENTS.md` can match a Claude `Stop` hook.
- VD03 — V02: `loop.stop-gate.model@1` covers Claude `Stop` hooks of type `prompt` or `agent` only. `loop.stop-hook-active-checked@1` covers Claude `Stop` command hooks whose literal command contains `stop_hook_active`; it is positive-only and never reads referenced scripts (catalog:171 weak signal; catalog:2567).
- VD04 — V03: `tool_version` and `package.json` version become 0.2.0. Flow fixtures that embed the tool version are regenerated with the existing `bun scripts/materialize-fixtures.ts`; only `tests/fixtures/flow/*.json` change.

## COVERAGE TABLE

| Source requirement | Required behavior | Task IDs |
|---|---|---|
| T17 (`17-detector-registry.md:3`) | `detector_unsupported` only for grammars outside the bounded subset | V01, V02 |
| Catalog 8.0 / spec 5.3 | Absence of output is unknown, never a negative fact | V01 |
| Catalog §10.1 `hooks.invokes-entrypoint@1`; T17 | Adapter-recognized hook event; literal command corresponds to a declared entrypoint; evidence traceable | V02 |
| Catalog §10.1 `loop.stop-gate.model@1` | Verified adapter's model stop evaluation declaration, no independence claim | V02 |
| Catalog §10.1 `loop.stop-hook-active-checked@1` | Weak signal of reading `stop_hook_active`; no blocking or budget inference | V02 |
| Interface §4.2 | Snapshot keeps observations whose evidence hashes bind to materials | V02 |
| Spec §11.1 | Same repository, policy and versions give the same observations | V03 |
| Brief: state which detectors stay unsupported and why | Eight detectors, reasons above | V01, V02; this file |

## OPEN QUESTIONS

For the owner. Nothing here is decided or planned. Numbering starts at OQ-3 because draft OQ-1 and OQ-2 became V01 and the V02 correspondence fix.

- OQ-3. Partial (b) gaps against catalog §10.1: CI jobs and trigger kinds (`ci-config-found`); lockfiles and `.tool-versions` (`environment.declarations`); Codex `instruction-file-found`; Makefile, justfile, Taskfile and pyproject manifests; general instruction command blocks; Stop-hook decision output; formatter configs reported under `analysis.config`.
- OQ-4. A declaration grammar (like D10) or new policy fields for `loop.routing-declared@1` and `policy.human-evaluation@1`; or CODEOWNERS reviewer fragments for the latter.
- OQ-5. A recovery declaration grammar for `recovery.local-plan@1`.
- OQ-6. Adapter documentation reviews with adapter version bumps: per-CLI hook event names for trigger recognition (for example Claude `PostToolUse`, Copilot `postToolUse`); Copilot `applyTo`, Claude `.claude/rules` paths, skill `description` selectors, Codex hooks, Copilot permissions, Claude and Copilot precedence.
- OQ-7. Reading repository scripts that hook commands reference (stop_hook_active reads, completion strings, decision output); a completion-comparison grammar for `loop.self-declared@1`.
- OQ-8. A test-case grammar for `tests.structure@1`; whether any structural observation may ever become a non-signal fact.
- OQ-9. `policy.verify-entrypoint@1` reads the D10 Markdown declaration, not a policy field; moving it needs a policy schema change.
- OQ-10. The loop association source for `loop.trigger@1` and `loop.bounds@1`: policy `loops[].scope` bound to the scanned policy, or a repository-only grammar.

# maat v2 planning debate log

## Owner instruction (binding for both sides, received 2026-11-05 during round 0)

> Over-design is forbidden. Plan v2 on a minimum viable basis: support only what the contracts require for each detector, choose the smallest change that makes it work (prefer wiring or finishing existing v1 code over new modules), and cut anything that is not needed to turn detector_unsupported into a real observation. Any extra idea goes to OPEN QUESTIONS, never into the plan. Both sides must challenge every proposal on this criterion.

Relayed verbatim to v2-critic at the start of round 1.

## Participants

- Lead planner: Claude (Opus 5.5), Herdr pane w1C:p7.
- Critic: Codex `v2-critic` (gpt-6.1-terra, reasoning xhigh), Herdr pane w1C:p8, started in this worktree.

## Usage-limit checks

| Before | Claude 5h used | Codex 5h left | Action |
|---|---|---|---|
| Round 0 | 17% | 95% (resets 01:50 on 6 Nov) | proceed |
| Round 1 | 20% | 92% | proceed |
| Round 2 | 21% | 90% | proceed |
| Round 3 | 22% | 88% | proceed |
| Round 4 | 23% | 86% | proceed |

## Round 0 — independent audits

Both sides audited the 25 detectors independently (Codex: scratchpad `critic-r0-audit.md`).

| # | Point | Claude | Codex | Resolution | Evidence |
|---|---|---|---|---|---|
| R0.1 | Is the 25-item list a list of unimplemented detectors? | No: the fallback emits `detector_unsupported` whenever no observation exists; the positive fixture has two files. | Same; no (a) case found. | Agreed. | `src/detectors/index.ts:24-26`; `tests/fixtures/positive/` holds `tasks/login.md` and `.maat/policy.yaml` only |
| R0.2 | Which detectors have no producer at all? | 10: instructions.scoping, loop.bounds, loop.routing-declared, loop.self-declared, loop.stop-gate.model, loop.stop-hook-active-checked, loop.trigger, policy.human-evaluation, recovery.local-plan, tests.structure (stub). | Same 10 classed (c). | Agreed. | Scan of all 18 v1 fixtures with three CLIs: these 10 plus analysis.config, evaluation.model-gate, security.config-signals are never emitted; the last three have producers but no fixture input |
| R0.3 | Hook-to-entrypoint trigger fact | Codex found it is unreachable. | Entrypoint scope is always `{}` but the match requires `e.scope.cli===a.name`. | Agreed as a v1 defect. Placement decided in round 1. | `src/detectors/entrypoints.ts:10`; `src/detectors/index.ts:16` |

## Round 1 — critique of r1 (Codex file: scratchpad `critic-r1.md`, 11 objections)

| # | Point (severity) | Codex | Claude | Resolution | Evidence |
|---|---|---|---|---|---|
| 1 | Class (b) exemption (blocker) | Some (b) producers do not perform their contracted observation: hook correspondence dead, `policy.verify-entrypoint` reads Markdown, `ci-config-found` lacks jobs/triggers. | Accept the hook fix: it finishes v1 code that T17 specifies ("exact literal command equality within the selected CLI") and is one filter. Reject the other two under the owner rule: both already emit a real observation; `policy.verify-entrypoint` follows approved D10 and moving it to policy needs a schema change; CI jobs/triggers is a gap, not an unsupported detector. Table now says "partial vs catalog row" for gaps. | Hook fix in plan (V02); other two to OQ-3/OQ-9. | `docs/plans/maat-impl/17-detector-registry.md:3`; `src/detectors/index.ts:16`; `docs/plans/maat-impl/00-overview.md` D10 |
| 2 | `grep` grammar for loop.self-declared (major) | Not a completion comparison. | Accept. No contract defines a bounded completion-comparison grammar; any regex is an invented heuristic. | loop.self-declared stays unsupported; OQ-7. | `catalog:2570` |
| 3 | stop_hook_active occurrence (major) | Occurrence is not a read; "not referenced" is a negative from absence. | Accept the second half: drop "not referenced". Keep a positive literal occurrence only: the catalog lists `stop_hook_active` in hook text as a weak signal, and the detector row is a weak signal. | Positive literal occurrence only, labeled as such. | `catalog:171`; `catalog:2567` |
| 4 | Loop association via scan-time policy (major) | Unrelated jobs; policy may differ at evaluate. | Accept policy independence: emit per workflow and per job at their true scopes, no policy lookup; evaluation scopes do the matching. Keep job `timeout-minutes` as a retained fragment. | V03 without policy; limits state no loop association. | `src/cli/audit.ts:41-53`; `catalog` 8.33 missing_input "只看到一個 max 參數時保留片段" |
| 5 | tests.structure via transpiler + regex (major) | Lexical counts are not case structure. | Accept. No zero-dependency parser establishes case structure or assertions; same reason as v1 T16. | Stays unsupported; OQ-8. | `docs/plans/maat-impl/16-configuration-signals.md:3` |
| 6 | recovery.local-plan from `.git/HEAD` (major) | Git alone is unknown; needs an explicit declaration. | Accept. | Stays unsupported; OQ-5. | `catalog:2582`; catalog 8.21 unknown "只有 Git／worktree" |
| 7 | Copilot `applyTo` (major) | Needs a Copilot CLI source for path, field and meaning. | Accept. v1 T12 read these files as candidates only; adding a selector is an adapter grammar change. | instructions.scoping stays unsupported; OQ-6. | `docs/plans/maat-impl/12-copilot-adapter.md:3` |
| 8 | No-input still reported as unsupported (major) | Must be in the plan; no new diagnostic code needed. | Accept: fallback emits `detector_unsupported` only for an explicit unsupported set; other IDs get an empty observation with a no-input limit. | V01. | `docs/plans/maat-impl/17-detector-registry.md:3`; `src/detectors/index.ts:24-26` |
| 9 | Acceptance test too weak; P2 overclaims (major) | Assert facts, scope, evidence; new scopes add rows. | Accept facts/scope/limits per new detector plus the unsupported set. Skip a snapshot round-trip: Observation type is unchanged and v1 T09 covers it. P2 reworded. | V04. | `src/evaluate/items.ts:15-18` |
| 10 | Version identity (major) | Same versions must give the same observations. | Accept `tool_version` 0.2.0; no adapter code changes, so adapter versions stay. Sandbox check: bump fails 2 version tests and 3 controller tests until `bun scripts/materialize-fixtures.ts` regenerates the flow fixtures (only `tests/fixtures/flow/*.json` change). | V05. | `docs/specs/2026-11-03-five-layer-tool-spec.md:325`; interface §2 |
| 11 | Format constraints (minor) | State v1 format rules. | Accept. | Added to overview. | `docs/plans/maat-impl/00-overview.md` Task execution |

Codex agreed in round 1 that model Stop retagging and keeping routing/human evaluation unsupported are reasonable.

## Round 2 — critique of r2 (Codex file: scratchpad `critic-r2.md`, 4 majors)

Codex accepted in round 2: OQ-3/OQ-9 deferral of CI jobs/triggers and policy-field provenance (with the limitation kept explicit); the positive-only `stop_hook_active` literal-occurrence weak signal with the r2 limits; policy-independent detectors over scan-time policy lookup.

| # | Point (severity) | Codex | Claude | Resolution | Evidence |
|---|---|---|---|---|---|
| 1 | Hook match evidence and binding (major) | Observation carries only hook evidence; `holds` should need a validated manifest binding. | Accept the evidence half: add the declaring document (and manifest when bound) to the observation evidence. Reject the binding half: T17 says equality "establishes only a declared trigger"; the binding is the `verify.entrypoint-declared@1` conditional prerequisite, evaluated separately for this item. | Evidence added; no binding gate. | `docs/plans/maat-impl/17-detector-registry.md:3`; `src/evaluate/items.ts:57-59`; catalog 8.3 conditional prerequisite |
| 2 | Every workflow becomes a loop observation (major) | `loop.trigger`/`loop.bounds` need a loop association; generic CI events and job timeouts are not loop observations. | Accept. The only association source is policy `loops[].scope`; using it reopens the snapshot-replay problem from round 1. Under the owner rule both stay unsupported; association source goes to OQ. | V03 removed; `loop.trigger@1` and `loop.bounds@1` stay unsupported; OQ-10. | `catalog:2583-2584`; `src/cli/audit.ts:41-53` |
| 3 | No-input limit overclaims (major) | Supported set is global; e.g. Codex finds AGENTS.md but never emits instruction-file-found. | Accept the truthful generic limit; add the Codex-with-AGENTS regression. | V01 limit: "No supported observation produced; input absent, outside the supported grammar, for an unselected CLI, or unreadable". | `src/adapters/codex/index.ts:6-11` |
| 4 | Snapshot round trip for multi-material evidence (major) | `parseSnapshot` checks every evidence hash; evaluate reads only snapshots. | Accept: one makeSnapshot → JSON → parseSnapshot → buildReport chain asserting the trigger claim. | Folded into V02 as its acceptance test, because a separate test-only task would have no red step. | `src/snapshot.ts:25-28` |

Sandbox check of r3 (scratch copy, not the repo): all 82 tests and `tsc --noEmit` pass; each new test fails on an untouched v1 copy.

## Round 3 — critique of r3 (Codex file: scratchpad `critic-r3.md`, 1 major, 1 minor)

Codex accepted in round 3: the declared-trigger versus separately evaluated entrypoint prerequisite distinction (T17; catalog 8.3), the truthful no-output wording, the eight unsupported dispositions, policy-independent snapshot behavior and the minimal round-trip test.

| # | Point (severity) | Codex | Claude | Resolution | Evidence |
|---|---|---|---|---|---|
| 1 | Trigger for unrecognized hook events (major) | Both adapters emit `hook:<event>` for any key; `DefinitelyNotAnEvent` + `bun test` would give `trigger = holds`. Catalog requires an adapter-recognized event. | Accept, with the smallest grounded set: the only event names v1 itself names are Claude `Stop` and Copilot `agentStop` (T17 stop-gate branch). A wider list (e.g. `PostToolUse`) is adapter knowledge needing a doc review, so it goes to OQ-6 rather than into the plan. | `recognizedStop` gate in V02; negative test for an unknown event; positive test for each retained adapter/event. | `src/adapters/claude-code/index.ts:20-32`; `src/adapters/copilot/index.ts:13-22`; `docs/plans/maat-impl/17-detector-registry.md:183`; `catalog:2563` |
| 2 | Manifest evidence branch untested (minor) | Tests declare `bun test`, which binds no manifest. | Accept: the focused test now declares `bun run test` with `package.json` and asserts hook, document and manifest evidence with hashes. | Done in V02 test. | `src/detectors/entrypoints.ts:9-11` |

Fresh replay of r4 on a new v1 copy: V01 red 2 / green 79; V02 red 4 / green 82; V03 red 2 / green 82; `tsc --noEmit` clean; the brief's scan reports 8 `detector_unsupported` at tool_version 0.2.0.

## Round 4 — consensus

Codex reviewed r4 (scratchpad `critic-r4.md`) and raised no objection.

Usage-limit pauses: none. Both 5-hour limits stayed far above the 10% pause threshold at every check (lowest: Claude 23% used, Codex 86% left).

## Consensus record

- Agreed revision: **r4** = `00-overview.md`, `01-registry-support-status.md`, `02-hook-wiring-and-stop-gates.md`, `03-version-identity.md` as of 2026-11-05.
- Codex (v2-critic), verbatim (two lines): "AGREE r4" / "The recognized-event gate and manifest-evidence test resolve my remaining objections, and the plan retains the agreed minimum scope and explicit unsupported cases."
- Claude (lead planner): "AGREE r4 — The plan is the minimum the contracts require to stop false `detector_unsupported` reports and to make the two Stop-gate detectors and the hook trigger real; every wider idea is an OPEN QUESTION, and the full V01–V03 replay on a fresh v1 copy passes."

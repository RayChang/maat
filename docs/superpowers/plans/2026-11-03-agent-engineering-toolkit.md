# Cross-Project Agent Engineering Toolkit Implementation Plan

> **已被取代，請勿執行下列舊步驟。** 依 D10，改用
> [新版實作計畫](./2026-11-03-five-layer-tool-implementation.md) 與
> [正式 spec](../specs/2026-11-03-five-layer-tool-spec.md)。
> 下文是歷史紀錄；原型程式、未建立 Git commit、六個 check 等敘述不是目前 repo 的事實或有效限制。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the v3.2 keyword scorecard core with a local, read-only, evidence-first audit that produces reproducible JSON and Markdown findings.

**Architecture:** Add a small Python package for the versioned report model, finite check catalog, repository discovery, deterministic detectors, and renderers. Preserve `scripts/audit_repo.py` as the CLI entry point. Tag findings by five-layer concern, one of the seven harness subsystems, and evidence strength; keep the four Loop patterns as optional catalog classifications, never as claims of runtime behavior. Update documentation and the legacy CI workflow to remove unsupported score gates; leave the existing HTML workbench as a later client.

**Tech Stack:** Python 3.11+, standard-library `unittest`, PyYAML `safe_load` for Agent Skills frontmatter, Markdown/JSON.

**Review status:** Prior plan reviews identified ambiguities and requested per-check status rules, which are included below. This revision aligns the plan with the user-approved Loop-aware design and is pending a fresh plan review and execution choice.

---

## Plan constraints

- The design spec is `docs/superpowers/specs/2026-11-03-agent-toolkit-design.md`.
- Git has been initialized in the existing toolkit directory, but there are no commits and the pre-existing files are untracked. Do not claim a usable baseline diff or create a commit without user approval. Before code implementation, either obtain approval for an initial baseline commit (needed for meaningful diffs/worktrees) or obtain explicit acceptance to proceed directly in this worktree.
- Default audit behavior must remain local, read-only, and must not execute target repository code or access the network.
- The workbench HTML, cross-platform runtime orchestration, auto-remediation, LLM judging, language-specific test/lint command normalization, seven new subsystem checks, runtime Loop execution claims, verifier-quality scoring, and a universal readiness score are out of scope for v1.
- Keep the legacy explicit `--init` path isolated from the audit pipeline; do not extend its scaffolding behavior in this plan.
- Use `python3 -m unittest discover -s tests -v` as the focused test command. The project currently has no test suite or Python dependency manifest.

## File map

| File | Responsibility |
|---|---|
| `agent_audit/__init__.py` | Package boundary and version exports. |
| `agent_audit/models.py` | Typed report, finding, recommendation, evidence, adapter-status, applicability, five-layer concern, harness subsystem, optional Loop pattern, and evidence-strength values. |
| `agent_audit/catalog.py` | Six v1 checks with concern/subsystem mapping, optional Loop pattern, applicability, evidence strength, source metadata, supported/unsupported adapter matrix, paths, and CI path patterns. |
| `agent_audit/discovery.py` | Safe local file inventory with explicit search scope. |
| `agent_audit/detectors.py` | Instruction, Agent Skills, context-size, CI-presence, and evidence-gap checks. |
| `agent_audit/report.py` | Stable JSON serialization and Markdown report rendering. |
| `scripts/audit_repo.py` | Backward-compatible command entry point; delegates audit mode to the package and keeps explicit legacy initialization isolated. |
| `requirements.txt` | Declares the YAML parser needed for spec-compliant frontmatter parsing. |
| `tests/` | Standard-library unit and CLI tests with temporary repository fixtures. |
| `SKILL.md`, `.claude/skills/agent-engineering-auditor/SKILL.md`, `.codex/skills/agent-engineering-auditor/SKILL.md` | Keep the three distributed skill copies aligned with the evidence-first workflow and state any custom/legacy location accurately. |
| `README.md`, `AGENTS.md`, `.github/copilot-instructions.md` | Document the audit boundaries and Loop/Harness distinction; remove unsupported universal line-count claims and qualify local policy. |
| `.github/workflows/agent-readiness.yml` | Keep the existing workflow runnable without the retired maturity threshold; report findings without a readiness score gate. |

## Task 1: Define the report model and test harness

**Files:**
- Create: `agent_audit/__init__.py`
- Create: `agent_audit/models.py`
- Create: `requirements.txt`
- Create: `tests/test_models.py`
- Create: `tests/__init__.py`

- [ ] **Step 1: Write status and report-model tests**

Test that the finding status values are exactly `verified`, `partial`,
`missing`, `not_applicable`, and `unknown`. Test that every finding can carry a
check ID, evidence list, confidence, and detector version, and that `missing`
findings can record the exact paths/patterns and exclusions searched. Test
that each finding carries its five-layer concern and evidence strength
(`artifact_presence`, `operational_enforcement`, or `task_outcome`), with an
optional harness subsystem when the check maps to one; v1 findings must use
only `artifact_presence`. A Loop-pattern tag is optional and restricted to
`agent_execution`, `verification`, `event_driven`, or `hill_climbing`; it
cannot imply the loop ran. Also test that report models include a repository
profile, an adapter matrix with
`supported`/`unsupported`/`unknown` states, and concern applicability with an
optional user-supplied reason.

- [ ] **Step 2: Run the model tests and confirm they fail**

Run: `python3 -m unittest tests.test_models -v`
Expected: FAIL because `agent_audit.models` does not yet exist.

- [ ] **Step 3: Add the minimal model and dependency declaration**

Define `FindingStatus`, `AdapterStatus`, `Applicability`, `EvidenceStrength`,
`HarnessSubsystem`, `LoopPattern`, `Evidence`, `Finding`, `Recommendation`,
`RepositoryProfile`, and `AuditReport` with standard dataclasses and enums.
Represent `five_layer_concern`, optional `harness_subsystem`,
`evidence_strength`, and optional `loop_pattern` as explicit typed fields. V1
uses only `artifact_presence`; do not manufacture `operational_enforcement` or
`task_outcome` evidence. A recommendation has a check ID, priority
(`must_fix`, `consider`, or `informational`), rationale, next action, and
source URLs; sort in the exact order `must_fix`, `consider`, `informational`.
Priority describes toolkit triage only, not predicted agent success or project
risk. The profile contains the directory name, scan-scope label, number of
files inspected, observed project-marker filenames, and explicitly selected
target clients; do not emit an absolute local path or claim language support
from a marker alone.
Include `schema_version` and `catalog_version` in the report. Add
`PyYAML>=6.0,<7` to `requirements.txt`; the implementation must use
`yaml.safe_load`, never unsafe object construction.

- [ ] **Step 4: Run the model tests**

Run: `python3 -m unittest tests.test_models -v`
Expected: PASS.

## Task 2: Encode the finite v1 catalog and supported surfaces

**Files:**
- Create: `agent_audit/catalog.py`
- Create: `tests/test_catalog.py`

- [ ] **Step 1: Write catalog tests**

Assert there are exactly six checks with IDs:
`instruction-file-found`, `skill-metadata-valid`, `skill-location-found`,
`context-size-reported`, `ci-config-found`, and `evidence-gap-reported`.
Assert every check defines its concern, purpose, applicability conditions,
evidence class/strength, five-layer concern, source type, source URL, and
evidence boundary. Assert a harness subsystem is defined where applicable.
Relevant checks may carry one of the four Loop-pattern tags, but no tag may
claim that its loop executes successfully.
Assert the catalog defines the v1 adapter paths and CI filenames. Assert Claude
Code, Codex, and GitHub Copilot are `supported`; Cursor, Gemini CLI, and Cline
are `unsupported` in v1; any unlisted client is `unknown`. Assert each check
has a source-linked recommendation policy and ordered triage priority, and no
check defines a universal instruction line limit or maturity score.

- [ ] **Step 2: Run tests to confirm the catalog is absent**

Run: `python3 -m unittest tests.test_catalog -v`
Expected: FAIL because `agent_audit.catalog` does not yet exist.

- [ ] **Step 3: Add immutable catalog definitions**

Encode only the exact paths in the design spec:

```text
AGENTS.md
CLAUDE.md
.claude/skills/**/SKILL.md
.agents/skills/**/SKILL.md
.github/copilot-instructions.md
.github/instructions/**/*.instructions.md
skills/**/SKILL.md
```

Treat `.codex/skills/**/SKILL.md` only as a configurable custom/legacy path,
not as a documented cross-vendor standard. Encode these CI patterns:
`.github/workflows/*.{yml,yaml}`, `.gitlab-ci.yml`,
`azure-pipelines.yml`, `Jenkinsfile`, `.circleci/config.yml`, and
`bitbucket-pipelines.yml`. Define supported adapter IDs as `claude_code`,
`codex`, and `github_copilot`; define known unsupported IDs as `cursor`,
`gemini_cli`, and `cline`; preserve unknown for any other client ID. This is a
tool capability matrix, not a claim that the repository uses those clients.
Add repeatable `--target-client` choices for `claude_code`, `codex`, and
`github_copilot`; default to no selected target client. Only recommend a
missing vendor-specific file when that client was explicitly selected.
Store the six check definitions with concern, purpose, five-layer concern,
applicable harness subsystem, optional Loop pattern, applicability, evidence
class/strength, source type (`research`, `vendor_documentation`,
`practitioner_guidance`, or `toolkit_policy`), source links, evidence
boundaries, and catalog version. Define recommendation policies with source
links and stable priority ordering: invalid Agent Skills metadata is `must_fix` for format conformance;
missing project/client-specific surfaces are `consider` and conditional on
the user’s selected target client; size and unobservable remote/runtime
controls are `informational`.

Map checks to the taxonomy without inventing runtime conclusions:

| Check | Five-layer concern | Harness subsystem | Optional Loop pattern |
|---|---|---|---|
| `instruction-file-found` | Context | Memory and context | — |
| `skill-metadata-valid` | Context | Extensibility | — |
| `skill-location-found` | Context | Extensibility | — |
| `context-size-reported` | Context | Memory and context | — |
| `ci-config-found` | Loop | Not applicable | Event-driven |
| `evidence-gap-reported` | Harness / Loop, based on the control | Safety and permissions when applicable; otherwise not applicable | Verification or agent/execution when applicable |

Use the taxonomy labels only for navigation and report grouping. Do not infer
that a CI workflow is an agent event loop, that a skill was activated, or that
a verifier ran.

- [ ] **Step 4: Run catalog tests**

Run: `python3 -m unittest tests.test_catalog -v`
Expected: PASS; the exact check IDs and paths match the spec.

## Task 3: Implement bounded, read-only repository discovery

**Files:**
- Create: `agent_audit/discovery.py`
- Create: `tests/test_discovery.py`

- [ ] **Step 1: Write discovery tests**

Use temporary repositories to verify root paths and supported nested skill and
CI paths are discovered. Verify unrelated hidden directories and symlink
targets are not followed. Verify a missing finding records the root searched,
patterns inspected, and exclusions, rather than returning an empty,
success-shaped result.

- [ ] **Step 2: Run tests to confirm discovery is absent**

Run: `python3 -m unittest tests.test_discovery -v`
Expected: FAIL because `agent_audit.discovery` does not yet exist.

- [ ] **Step 3: Implement discovery**

Use `pathlib`/`os.walk` without following symlinks. Return an explicit
inventory and scan-scope record. Do not invoke subprocesses, inspect remote Git
settings, read environment secrets, or make network requests. Treat unreadable
paths as errors or unknown evidence with a diagnostic; do not silently skip
them.

- [ ] **Step 4: Run discovery tests**

Run: `python3 -m unittest tests.test_discovery -v`
Expected: PASS, including symlink and scan-scope cases.

## Task 4: Implement the six evidence-bounded detectors

**Files:**
- Create: `agent_audit/detectors.py`
- Create: `tests/test_detectors.py`
- Create: `tests/fixtures/valid-skill/SKILL.md`
- Create: `tests/fixtures/invalid-skill/SKILL.md`

- [ ] **Step 1: Write detector tests**

Cover empty/missing instruction files; valid and invalid skill frontmatter;
skill name syntax and directory mismatch; line/byte counts; each recognized CI
file; missing CI files; unknown remote/runtime controls; and the case where a
file is present but no execution claim is made. Assert that v1 results carry
`artifact_presence` evidence only, and that taxonomy tags never claim a Loop
pattern executed. Assert the status rules below for positive, mixed, absent,
not-applicable, and incomplete-scan cases.

- [ ] **Step 2: Run tests to confirm the required checks fail**

Run: `python3 -m unittest tests.test_detectors -v`
Expected: FAIL until detector functions are implemented.

- [ ] **Step 3: Implement deterministic detectors**

Parse frontmatter with `yaml.safe_load`, validate only fields and constraints
defined by the Agent Skills specification, and mark malformed/unsupported YAML
as `unknown` with a diagnostic rather than accepting it. Report instruction
file size without a pass/fail threshold. Detect CI configuration presence
only. Emit `unknown` for remote branch protection and runtime enforcement.

Use these status rules; `missing` describes an absent artifact in the complete
declared scan scope, not a quality failure:

| Check | `verified` | `partial` | `missing` | `not_applicable` | `unknown` |
|---|---|---|---|---|---|
| `instruction-file-found` | At least one supported instruction file is readable and non-empty. | At least one is found, but another candidate path is unreadable. | Complete scan finds no non-empty instruction file. | Never inferred from absence; only if explicitly excluded with a reason. | No readable evidence and the scan was incomplete. |
| `skill-metadata-valid` | Every discovered skill has valid required metadata. | Some discovered skills validate and some do not. | Skills exist, but none has valid required metadata. | No skill files exist to validate. | A skill file cannot be read or its frontmatter cannot be parsed reliably. |
| `skill-location-found` | A skill is found in a supported location. | A skill is found, but another expected path is unreadable. | A selected target client expects a skill and none is found. | No skills are found and no target client was selected. | The relevant search scope is incomplete. |
| `context-size-reported` | At least one instruction file was measured. | Some instruction files were measured and others were unreadable. | Never used; no instruction file is not a size failure. | No instruction files exist to measure. | No file could be measured due to read errors. |
| `ci-config-found` | A recognized CI file is found. | A recognized file is found, but another candidate path is unreadable. | Complete scan finds no recognized CI file. | Never inferred from absence; only if explicitly excluded with a reason. | No readable evidence and the scan was incomplete. |
| `evidence-gap-reported` | Never used; local inspection cannot prove remote/runtime enforcement. | Never used. | Never used. | No remote/runtime control was selected for assessment. | A relevant remote/runtime control is in scope but cannot be verified locally. |

If a check is explicitly excluded, require a reason and still record its search
scope. Never convert read errors, malformed inputs, or incomplete scans into
`verified`.

- [ ] **Step 4: Run detector tests**

Run: `python3 -m unittest tests.test_detectors -v`
Expected: PASS with no network or target-code execution.

## Task 5: Add stable JSON/Markdown output and the CLI

**Files:**
- Create: `agent_audit/report.py`
- Modify: `scripts/audit_repo.py`
- Create: `tests/test_report.py`
- Create: `tests/test_cli.py`

- [ ] **Step 1: Write serialization and CLI tests**

Assert JSON includes schema/catalog versions, repository scope, findings,
five-layer concern, applicable harness subsystem, optional Loop pattern,
evidence strength, confidence, detector versions, searched paths for missing items, the
repository profile, adapter matrix (including unsupported adapters), and
prioritized source-linked recommendations. Assert Markdown presents evidence
class, the evidence-strength boundary, and uncertainty. Assert a Loop tag is
presented as classification only, not as proof that a configured trigger or
verification loop executed. Assert the existing command
`python3 scripts/audit_repo.py /path/to/repo --output-json` still emits valid
JSON, and default output is readable Markdown.

- [ ] **Step 2: Run tests to confirm output and CLI behavior are missing**

Run: `python3 -m unittest tests.test_report tests.test_cli -v`
Expected: FAIL for the new schema and formats.

- [ ] **Step 3: Implement renderers and CLI delegation**

Add a versioned JSON serializer and Markdown renderer. Include the repository
profile (directory name, scan-scope label, inspected-file count, observed
marker filenames, explicitly selected target clients), each adapter's support
status and searched paths, and a
recommendation list sorted by priority with source URLs. Do not include an
absolute local path or imply the priority predicts agent outcomes. Preserve the script
path and `--output-json` invocation. Make `--ci` produce machine-readable
findings without assigning a universal maturity level. Reject the old
`--min-level` maturity gate with an actionable message instead of silently
pretending it remains evidence-based. Add repeatable `--not-applicable CHECK_ID`
and require `--applicability-reason` when any check is excluded; preserve the
reason and searched scope in the report. Add
`--graph-applicability {applicable,not_applicable,unknown}` with default
`unknown`; require the same reason when set to `not_applicable` and record it
without scoring. Add repeatable `--target-client` choices matching the adapter
IDs; the default is none. Keep the existing explicit `--init` code path
separate and unchanged.

- [ ] **Step 4: Run report and CLI tests**

Run: `python3 -m unittest tests.test_report tests.test_cli -v`
Expected: PASS; JSON parses and includes evidence scope for absent files.

## Task 6: Update the auditor skill and user documentation

**Files:**
- Modify: `SKILL.md`
- Modify: `.claude/skills/agent-engineering-auditor/SKILL.md`
- Modify: `.codex/skills/agent-engineering-auditor/SKILL.md`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `.github/copilot-instructions.md`
- Modify: `.github/workflows/agent-readiness.yml`
- Create: `tests/test_skill_docs.py`

- [ ] **Step 1: Write documentation consistency tests**

Verify the three skill files state the same six check IDs and all updated
guidance files do not claim that arXiv:2602.11988 mandates a 200-line limit,
that `@AGENTS.md` is universal, or that a static artifact proves runtime
enforcement or Loop execution. Verify the four Loop pattern names are
consistently described as a practitioner taxonomy, not an empirically
validated universal standard. Assert the readiness workflow no longer passes
the retired `--min-level` option and does not gate on an unsupported maturity
threshold.

- [ ] **Step 2: Run tests to confirm the current documentation fails**

Run: `python3 -m unittest tests.test_skill_docs -v`
Expected: FAIL because the v3.2 skill copies still advertise the old 32-item
heuristic and unsupported thresholds.

- [ ] **Step 3: Update the skill copies and README**

Document local read-only behavior, supported paths, schema, status meanings,
unknown evidence, the distinction between Harness structure and Loop
behavior, the four Loop patterns as a practitioner taxonomy, setup
(`python3 -m pip install -r requirements.txt`), and the exact CLI. Remove the
unsupported claim that arXiv:2602.11988 mandates a 200-line AGENTS.md limit;
if a local limit is retained, label it as toolkit policy rather than research.
Update `AGENTS.md`, `.github/copilot-instructions.md`, the skill copies, and
README consistently. In `.github/workflows/agent-readiness.yml`, install
`requirements.txt` after Python setup and replace
`python3 scripts/audit_repo.py . --ci --min-level 3` with
`python3 scripts/audit_repo.py . --ci`; CI should report machine-readable
findings but must not gate on an unsupported maturity threshold. Keep copies
byte-identical where they are intended to be the same skill. Do not update the
HTML workbench in this release.

- [ ] **Step 4: Run documentation consistency tests**

Run: `python3 -m unittest tests.test_skill_docs -v`
Expected: PASS; all distributed skill copies agree with the catalog.

## Task 7: Verify end-to-end safety and output

**Files:**
- Modify: `tests/test_cli.py`
- Create: `tests/fixtures/sample-repo/AGENTS.md`
- Create: `tests/fixtures/sample-repo/skills/example/SKILL.md`
- Create: `tests/fixtures/sample-repo/.github/workflows/ci.yml`

- [ ] **Step 1: Add end-to-end fixture assertions**

Run the CLI against the fixture and assert report findings point to fixture
paths. Assert no subprocess is launched for target project code, no network is
accessed, graph applicability defaults to `unknown` and can be marked
`not_applicable` only by explicit CLI input, and the report contains explicit
unknowns for remote/runtime controls and unknown client IDs. Assert the report
includes the profile, adapter matrix, and priority-sorted recommendations with
their source URLs.

- [ ] **Step 2: Run the complete focused suite**

Run: `python3 -m unittest discover -s tests -v`
Expected: all tests pass.

- [ ] **Step 3: Run a manual audit against this toolkit directory**

Run: `python3 scripts/audit_repo.py . --output-json`
Expected: a valid evidence-rich report; findings describe observed files and
do not claim a maturity level, operational enforcement, or task success.

- [ ] **Step 4: Inspect output scope**

Run: `git diff --stat`
Expected: only files listed in this plan are changed, after a tracked baseline
has been authorized and established. If the user instead approved direct
workspace implementation without a baseline commit, use `git status --short`
and manually inspect every changed or untracked project file; do not imply
that a diff against the original toolkit is available.

## Stage 3 follow-on: Outcome evaluation (separate from v1 audit)

Do not implement an outcome benchmark as part of the v1 scanner. After the v1
audit is complete, create a separate evaluation protocol and obtain approval
for the task set and execution conditions. The protocol must:

- define a repository baseline and a specific, falsifiable intervention;
- fix the task set and record agent, model, harness, tool, and prompt versions;
- repeat runs and report task completion and inference/tool cost;
- evaluate verifier scalability, faithfulness to task intent, and robustness
  against bypass or reward hacking rather than treating verifier presence as
  quality;
- if measuring artifact legibility, use hidden intent-traced questions,
  artifact-evidence audits, and recovery accuracy/repeatability gates before
  interpreting inspection effort;
- use controls for model priors and specification access, report uncertainty,
  and scope conclusions to the tested tasks and agent panel.

## Handoff notes

- The Claude Artifact remains unverified until its rendered content is
  exported or supplied; do not block the v1 scanner on reproducing it.
- If users want a maturity ranking later, treat it as a separate policy layer
  with explicit thresholds and empirical calibration, not as a detector.
- Before v1 code changes, resolve the Git baseline gate in Plan constraints:
  no commits or worktree isolation can be claimed until tracked history exists.
- The HTML workbench and old maturity UI remain unchanged during v1; report
  that limitation rather than presenting the old scorecard as the new audit.

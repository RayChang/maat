# Cross-Project Agent Engineering Toolkit — Design

**Status:** Design revision approved; spec review pending; implementation plan awaits human review
**Date:** 2026-11-03

## Context

The current v3.2 prototype combines a five-layer checklist, cross-cutting coding
guardrails, a standalone HTML workbench, a Python repository scanner, and
Claude/Codex/Copilot templates. Its aim is useful: help software teams make
coding-agent work more reliable across projects and vendors.

The checklist is a synthesis, not an established standard. Its source material
contains different evidence classes: peer-reviewed or preprint studies,
engineering reports, vendor guidance, product documentation, and practitioner
terminology. Those must be distinguished in both the rubric and its output.

The current scanner primarily infers readiness from file existence and
keyword matches. Such signals can establish that an artifact is present, but
cannot establish that a hook runs, a permission is enforced, or an agent
performs better. For example, `no_skill_leakage` currently allows an oversized
section whenever the document mentions a skill, and its graph-fit detection is
based on a small keyword list. The workbench also presents the 200-line
AGENTS.md limit as supported by arXiv:2602.11988, although that paper studies
task outcomes and inference cost and does not establish a universal line limit.

The linked Claude Artifact currently exposes a client-rendered shell to
text-based retrieval. This design therefore treats the local
`agent-engineering-workbench.html` and the supplied public references as the
auditable baseline; exact parity with the Artifact remains unverified.

## Goals

- Provide a practical, vendor-neutral way to inspect how a software repository
  supports AI coding-agent work.
- Make every finding traceable to repository evidence, a rule definition, and
  the source or rationale behind that rule.
- Separate what can be detected statically from what requires execution,
  configuration access, or human judgment.
- Keep the default audit local, read-only, deterministic, and safe for
  untrusted repositories.
- Support an extensible report format that can later power CLI, CI, and a web
  workbench without making the web UI the source of truth.

## Non-goals

- Running agents or orchestrating autonomous coding work.
- Creating a universal configuration language for vendor-specific hooks,
  permissions, memory, or approval systems.
- Claiming a repository-readiness score predicts agent task success without
  validation against actual task outcomes.
- Requiring every project to use multi-agent graphs or all five conceptual
  areas.
- Automatically changing repositories in the first version.

## Conceptual model

Treat the five labels as complementary engineering concerns, not a mandatory
concentric architecture or a validated maturity ladder:

1. **Prompt / task specification:** goals, constraints, acceptance criteria,
   and expected output.
2. **Context / knowledge:** project instructions, retrieval, memory, and
   reusable skills.
3. **Harness / controls:** tools, permissions, isolation, hooks, verification,
   persistence, and observability.
4. **Loop / feedback:** execution, verification, retry/stop decisions, event
   triggers, and evidence-driven improvement.
5. **Graph / orchestration:** explicit state, nodes, routing, handoffs, and
   parallel work when task complexity requires them.

Security, privacy, reliability, cost, and human oversight are cross-cutting
attributes evaluated against the relevant concern. Graph is opt-in or
not-applicable for sequential, single-agent work. "Hermes Agent" is treated as
an implementation example, not as a distinct "Hermes Engineering" discipline;
use "Harness Engineering" when referring to the surrounding agent controls.

### Harness subsystems and Loop relationship

Harness describes the runtime structure that lets an agent act; Loop describes
the dynamic execution and feedback behavior that the runtime supports. They
overlap, but are not synonyms: a verifier may be part of the harness while the
verification loop describes how its result changes the agent's next action.

Use the following seven harness subsystems as a classification map, not as
seven mandatory capabilities or seven additional v1 checks:

| Harness subsystem | Primary five-layer relationship |
|---|---|
| Agent loop | Loop; Harness |
| LLM integration | Harness |
| Tools and actions | Harness |
| Memory and context | Context; Harness |
| Safety and permissions | Harness; cross-cutting |
| Orchestration | Graph; Harness |
| Extensibility | Context; Harness |

For Loop analysis, retain the four patterns described in LangChain's
practitioner framework as useful vocabulary, not a validated standard:

| Loop pattern | Operational driver | Evidence boundary |
|---|---|---|
| Agent/execution | Model responses, tool results, stop and retry rules | Static files can show configuration or code, not prove runtime behavior. |
| Verification | Tests, graders, human review, or other verifiers | Presence does not establish verifier faithfulness or resistance to bypass. |
| Event-driven | Hooks, CI events, schedules, or external triggers | A trigger definition does not prove that it fires or completes successfully. |
| Hill-climbing | Observed outcomes, an explicit hypothesis, a changed harness, and comparison to a baseline | A change log alone does not establish improvement. |

Persisted task state and fresh-context resets are possible mechanisms for
long-running loops, not proof of loop quality. In v1, findings may be tagged
with their relevant subsystem and evidence boundary, but the scanner will not
infer that any loop executes successfully.

## Approaches considered

### A. Checklist-first scorecard

Keep the current checklist as the primary product and improve its questions,
scoring, and UI. This is easy to understand and ship, but risks turning
subjective or unsupported requirements into apparently objective scores.

### B. Evidence-first repository audit — recommended

Make versioned check definitions and evidence the product core. Deterministic
detectors report only what they can establish; operational checks and task
performance remain separate evidence classes. A scorecard is a presentation
of these findings, not a substitute for them.

### C. Cross-platform agent runtime

Build a shared execution layer for agent tasks, permissions, hooks, memory,
and orchestration across vendors. This could offer deeper controls, but vendor
mechanisms differ and the scope is much larger than an auditable toolkit.

Choose **B** for v1. It addresses trustworthiness and portability while leaving
runtime orchestration to existing agent products.

## Proposed architecture

### 1. Versioned check catalog

Each check has a stable ID and records:

- concern and purpose;
- the relevant five-layer concern and harness subsystem, where applicable;
- applicability conditions and `not_applicable` criteria;
- evidence class and detection method;
- evidence required to pass, fail, or remain unknown;
- source references, source type, and evidence strength;
- limitations, confidence, and catalog version.

Keep research findings, vendor recommendations, and toolkit policy separate.
For example, "avoid duplicating formatter rules in prose" can be supported by
configuration-smell research; an exact line-count cap remains a configurable
housekeeping heuristic unless stronger evidence is found.

The v1 catalog is limited to these checks:

| ID | Check | Evidence boundary |
|---|---|---|
| `instruction-file-found` | Detect non-empty instruction files at the supported paths above. | Presence only; not instruction quality or client loading. |
| `skill-metadata-valid` | Validate required Agent Skills `name` and `description`, name syntax, and directory-name match. | Format conformance only; not skill usefulness or runtime support. |
| `skill-location-found` | Report skills discovered in each supported location. | Path presence only; unknown locations are not silently assumed unsupported. |
| `context-size-reported` | Report line and byte counts for instruction files. | Informational only; no universal pass/fail line threshold. |
| `ci-config-found` | Detect only the CI configuration paths listed above. | File presence only; no claim that a pipeline runs or passes. |
| `evidence-gap-reported` | Mark remote or runtime controls that cannot be observed locally as `unknown`. | Must not convert missing access into a pass. |

No v1 check scores semantic instruction quality, infers effective permissions,
or estimates actual agent success.

### 2. Local repository discovery

Build a read-only scanner that identifies project/language signals and agent
configuration surfaces. It may inspect files and parse known formats, but v1
must not execute repository scripts, contact model APIs, or upload code.
Report unavailable evidence explicitly (for example, branch protection cannot
be verified from a local checkout alone).

### 3. Vendor capability adapters

Adapters detect documented surfaces such as `AGENTS.md`, `CLAUDE.md`,
`.github/copilot-instructions.md`, skills, hooks, and permission settings.
Report each surface as vendor-specific and identify the basis for detection.
Do not imply that an import directive or one vendor's settings are interpreted
the same way by other agents.

For v1, support this finite discovery list:

| Surface | Paths inspected |
|---|---|
| Shared project instructions | root `AGENTS.md` |
| Claude Code instructions and skills | root `CLAUDE.md`; `.claude/skills/**/SKILL.md` |
| Codex instructions and skills | root `AGENTS.md`; `.agents/skills/**/SKILL.md` |
| GitHub Copilot instructions | `.github/copilot-instructions.md`; `.github/instructions/**/*.instructions.md` |
| Generic Agent Skills packages | `skills/**/SKILL.md`; `.agents/skills/**/SKILL.md` |
| CI configuration presence | `.github/workflows/*.{yml,yaml}`; `.gitlab-ci.yml`; `azure-pipelines.yml`; `Jenkinsfile`; `.circleci/config.yml`; `bitbucket-pipelines.yml` |

These are detection locations, not guarantees that each client will load every
file. Treat `.codex/skills/**/SKILL.md` as a configurable legacy/custom
location because it exists in the current prototype, not as a claimed
cross-vendor standard. Do not interpret vendor hooks, permission semantics, or
memory behavior as equivalent. Cursor, Gemini CLI, Cline, and other clients
are future adapters.

### 4. Evidence evaluator

Use explicit states:

- `verified`: the declared evidence was observed;
- `partial`: some required evidence exists, but the control is incomplete;
- `missing`: expected evidence was not found;
- `not_applicable`: the check does not apply, with a reason;
- `unknown`: the scanner cannot determine the result.

For each result, include file paths, line ranges or parsed setting names where
possible, detector ID/version, and confidence. Distinguish:

1. **Artifact presence** — a file or setting exists.
2. **Operational enforcement** — a check or permission is actually wired and
   cannot be silently skipped.
3. **Task outcome** — measured agent performance on a defined task set.

These are evidence strengths, not maturity levels. V1 checks only artifact
presence; operational enforcement and task outcome must remain explicitly
unmeasured or `unknown` unless supported by separate runtime or benchmark
evidence. Every finding must state which strength it establishes and what it
does not establish. The seven harness subsystems are tags for organizing
findings, not an expectation that every repository implements every subsystem.

Do not combine these into one unqualified score. If a maturity view is retained,
show its rubric, applicability, evidence coverage, and threshold as explicit
toolkit policy; do not attribute the five-layer / 80% mapping to Factory or
Kodus.

### 5. Reports and integrations

The core output is versioned JSON containing repository profile, catalog
version, findings, evidence, uncertainty, and any maturity view. Render
Markdown for review. A CLI and CI mode can consume the same JSON. Keep the
HTML workbench as a later presentation client; it should import/export the
versioned schema rather than maintain a second rubric.

### 6. Remediation

For v1, provide prioritized, source-linked recommendations only. Do not
scaffold or edit project files automatically until audit findings are
trustworthy and the user explicitly opts in.

## Evidence and evaluation strategy

- Unit-test each detector against small fixtures: positive, negative, malformed,
  nested, and ambiguous cases.
- Include fixtures where a file exists but the claimed control is not enforced.
- Test `unknown` and `not_applicable` behavior; neither should silently count
  as a pass.
- Compare scanner findings with a human-reviewed sample and record precision,
  recall, and disagreement by check.
- Evaluate verifiers separately along scalability, faithfulness to task intent,
  and robustness to bypass or reward hacking. A configured test or grader is
  not assumed to be a faithful verifier.
- In a later outcome study, test whether repository changes affect task success,
  cost, and artifact-side intent recoverability. Fix the task set and agent,
  model, and harness versions; repeat runs and report uncertainty. Where
  artifact legibility is measured, use intent-traced questions, evidence audits,
  and accuracy/repeatability gates before interpreting inspection effort.
- Until outcome validation exists, describe readiness as convention/evidence
  coverage, not agent capability. Do not mix static audit findings with
  verifier quality or task-outcome claims.
- Require a falsifiable prediction and measured outcome before promoting
  harness changes from experiments to recommended defaults.

### Later outcome-evaluation protocol

Keep outcome evaluation separate from the local v1 scanner. A future protocol
should compare a baseline repository with a defined intervention under fixed
tasks and fixed agent/model/harness conditions, with repeated runs. Report task
completion, inference or tool cost, and (where applicable) downstream agents'
intent-recovery accuracy, repeatability, evidence support, and inspection
effort. Use controls that distinguish artifact evidence from model priors or
access to the original specification. Interpret effort only when recovery is
accurate and stable; treat results as specific to the tested task and agent
panel, not as a universal readiness score.

## Initial MVP boundary

1. Define the JSON schema and the six source-attributed checks listed above.
2. Implement local deterministic checks for the exact instruction, skill, and
   CI paths listed above. Keep repository discovery language-neutral; do not
   normalize language-specific test/lint commands in this release.
3. Return evidence-rich JSON and Markdown without executing repository code.
4. Add a minimal vendor capability matrix and explicit unsupported/unknown
   results.
5. Retain the five conceptual areas as navigation and tag findings with the
   relevant harness subsystem and evidence strength. Do not add seven
   subsystem-level checks or assert operational enforcement.
6. Remove unsupported thresholds and make graph applicability explicit.

Defer auto-remediation, LLM judging, remote service integrations, runtime
orchestration, and a universal readiness score.

## Acceptance criteria

- A finding never claims a runtime control is enforced based only on a filename
  or keyword.
- Every non-unknown finding contains reproducible evidence and a detector
  version.
- Every finding identifies its evidence strength and relevant concern/subsystem
  without implying that artifact presence proves operational enforcement or
  task outcome.
- Each check identifies whether its basis is research, vendor documentation,
  practitioner guidance, or toolkit policy.
- Local scanning performs no network access and executes no target-repository
  code by default.
- The v1 adapter matrix is limited to AGENTS.md, Agent Skills, Claude Code,
  OpenAI Codex, and GitHub Copilot using the exact paths and six check IDs in
  this spec; unsupported clients are reported as unsupported rather than
  inferred.
- v1 CI checks report only recognized configuration-file presence, not remote
  branch-protection state, required checks, or successful pipeline execution.
- Graph-dependent checks can be marked not applicable without penalizing a
  single-loop project.
- JSON consumers can distinguish artifact presence, operational enforcement,
  task outcomes, and unknown evidence.
- The scanner's results are covered by representative fixture tests.

## Research basis and limits

- LangChain, ["The Art of Loop Engineering"](https://www.langchain.com/blog/the-art-of-loop-engineering):
  a four-loop practitioner/vendor framework, not itself a controlled study.
- Baltes et al., [arXiv:2608.21884](https://arxiv.org/abs/2608.21884):
  exploratory gray-literature review and repository mining; reports that the
  reviewed sources lack systematic evidence of loop-engineering benefits.
- Lin et al., [Agentic Harness Engineering (AHE), arXiv:2604.25850](https://arxiv.org/abs/2604.25850):
  empirical harness-evolution work with component, experience, and decision
  observability; results are tied to the paper's tasks and benchmarks.
- Wei et al., [Evo-Harness, arXiv:2608.15071](https://arxiv.org/abs/2608.15071):
  studies skill compilation from experience on specified benchmarks.
- Feng et al., [Graph Engineering, arXiv:2608.21156](https://arxiv.org/abs/2608.21156):
  a survey/framework for system-level agent graphs; not evidence that every
  coding project needs graph orchestration.
- Gloaguen et al., [Evaluating AGENTS.md, arXiv:2602.11988](https://arxiv.org/abs/2602.11988):
  the v3 study reports no general task-success improvement from context files
  in its tested settings and over 20% higher inference cost on average;
  developer-committed files outperform LLM-generated files by 7% on average in
  the reported comparison. These are benchmark-specific findings; the paper
  does not set an AGENTS.md line limit.
- Dos Santos et al., [Configuration Smells in AGENTS.md Files, arXiv:2606.15828](https://arxiv.org/abs/2606.15828):
  identifies six smells and reports their prevalence in a 100-repository
  sample; prevalence does not establish causal impact on agent success.
- Barbaste et al., [Harness Engineering: Anatomy, Architecture, and Evolution of Coding Agents, arXiv:2609.00006](https://arxiv.org/abs/2609.00006):
  a source-code study of eleven harnesses that proposes seven recurring
  subsystems and design patterns. It is descriptive, not a benchmark proving
  that every system needs every subsystem or that one architecture is optimal.
- Wang et al., [The Verification Horizon, arXiv:2606.26300](https://arxiv.org/abs/2606.26300):
  treats verifiers as proxies for intent and analyzes scalability, faithfulness,
  and robustness; verifier quality must not be inferred from its presence.
- [Build-and-Find, arXiv:2605.06136](https://arxiv.org/abs/2605.06136):
  separates behavioral correctness from artifact-side intent recovery and
  inspection effort. Its effort measure is interpreted only after recovery and
  repeatability gates, and its empirical conclusions are panel-local.
- LangChain, ["The Art of Loop Engineering"](https://www.langchain.com/blog/the-art-of-loop-engineering):
  supplies practitioner vocabulary for agent, verification, event-driven, and
  hill-climbing loops; it is not a controlled validation of the four patterns.
- [Factory Agent Readiness](https://factory.ai/news/agent-readiness) and
  [Kodus Agent Readiness](https://github.com/kodustech/agent-readiness):
  useful product precedents for criteria and reports, not neutral validation
  of this toolkit's five-layer mapping or thresholds.
- [Agent Skills specification](https://agentskills.io/specification):
  a published format for portable skill packages; support for optional fields
  and runtime behavior varies by agent.
- [Hermes Agent source repository](https://github.com/NousResearch/hermes-agent):
  a concrete product implementation with skills, memory, scheduling, and
  subagents; not a standard called "Hermes Engineering."

## Unresolved before implementation planning

- The Claude Artifact's rendered content must be supplied or exported to
  complete an exact line-by-line comparison.
- Supported platforms and languages need a prioritization decision before
  implementing adapters beyond the baseline.
- Thresholds and maturity levels should remain unset until calibrated against
  a reviewed repository sample and, separately, agent task outcomes.

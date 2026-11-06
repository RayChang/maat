---
name: maat-diagnose
description: Audit a project with maat and collect scoped, cited evidence without modifying the project.
---

Confirm the repository boundary and target CLI from the user's request or .maat/policy.yaml.
Use maat scan, selecting --cli claude-code, --cli codex, or --cli copilot only when selected by the user.
Without a selection, retain CLI-specific unknowns. Request explicit external evidence rather than reading home settings.
Store reports and snapshots only at an explicit location outside the target repository.
Read the summary first, then use maat explain for the specific check, capability, rule card, or template.
Follow inspection.review, evidence_requirements, and verification; titles and keywords do not prove content.
Keep machine observations, agent assessments with citations/uncertainty, and user attestations separate.
Use maat attest template --check prompt.task-spec as the concrete format example.
Collect the substantive human answer, quoted line ranges, exact material digests, scope, versions, owner, and expiry.
Submit only explicitly provided, sanitized evidence with --evidence.
Use maat evaluate with the saved snapshot; it must not reread repository files.
A rewritten candidate on identical evidence is not progress. Stop with the supported conclusion or remaining unknowns.
Do not edit the diagnosed project, run its programs/hooks/tests, or start an agent.
You may look up public documentation on the web to verify facts and advice. Cite the URL and the date checked, treat findings as agent assessments, and never send project code or secrets.
Do not claim runtime enforcement from configuration. Do not grant capabilities from an agent assessment.
Hand off the report, snapshot, versions, material fingerprints, selected targets, and limitations to improvement.
For a new project, request a minimal startup plan. For a Loop target, inspect required capabilities before suggesting changes.
One source serves Claude Code CLI, Codex CLI, and Copilot CLI; unsupported adapter surfaces stay unknown.

---
name: maat-improve
description: Carry out a finite maat improvement plan through the existing host after explicit scoped approval.
---

Use maat plan with the source report and user-selected targets. Use the one generic improvement procedure for every layer.
Load only the relevant versioned rule cards and templates. Prefer adequate existing project practices.
Ask for unknown paths, commands, formats, or CLI choices; never infer them from a template. When the user answers an action's target location or template values, write them to a JSON file keyed by plan action id, each {"path": "<repo-relative file>", "values": {"<template parameter>": "<text>"}}, and rerun maat plan with --answers <file>; maat then fills that action's target path and template, so the action stops asking for them. If the approved change for an action also needs other files, add "extra_paths": ["<repo-relative file>", ...] to that answer; an action's checkpoints may change only its target path and its extra paths. If the user allows retries after a failed verification, add "max_fixes": <rounds the user approved>; without it the action gets no fix rounds. If a plan action lists invalidates, tell the user before approval that those attestations stop counting once the action changes the files they cite, and after the change redraft them for the user to confirm again.
Show the concrete plan, rendered text, modified paths, dependencies, risks, verification, and fix/stop conditions.
Reject an empty render or unresolved placeholder. Changes to the plan, rule, template, or evidence require a new review.
Every modification requires explicit plan/action approval even when the catalog's needs_approval is false.
A true needs_approval also requires the relevant role approval. Preserve its stated source; do not claim authenticated identity.
Use maat flow open and maat flow approve to record the approved plan, base, boundaries, validity, and finite correction conditions. Get every approve, authorize, checkpoint, and record file from maat flow template --flow <id> --step <step> [--action <id>] right before submitting it; maat fills the sequence, ids, fingerprints, and bindings. Replace each null with the user's or host's own answer, delete any action the user did not approve together with its path and max_fixes entry, and do not edit the computed values.
Use maat flow authorize separately for each concrete command/script version, inputs, cwd, permissions, and external effects.
Modification approval does not authorize tests, installation, networking, or external actions.
Before each action, record maat flow checkpoint --flow <id> --action <id> --phase before --by <host>; without --fingerprints maat reads the current files itself, the same way its template does.
The existing host performs only the approved action. maat does not execute it and cannot prevent host bypass.
Preserve unrelated dirty work. Use the project's selected recovery method; do not require a clean tree or worktree.
Record the after checkpoint, candidate changes, executor source, and known or unknown effects.
Record evaluation separately. Human declaration checks may use valid human evidence without running a command. Finish one action before starting the next: before checkpoint, change, after checkpoint, change record, then its evaluation; maat flow template refuses a step the flow cannot take yet. In the evaluation file, result is one of pass, fail, unknown, error, timeout, cancel; method is {"kind": "manual" or "command", "id": "<text>", "version": "<text>"}; report is the whole JSON report of a fresh maat scan or maat evaluate of the current files, and a pass requires it; execution stays null for a manual method; unknown_effects is a list, empty when there are none. Accept is one decision for the whole flow: it reads each action's latest evaluation of the current files, so after attestations change, record a new evaluation for every action with a fresh report. When an item can pass only on an attestation the user confirms after the change, record that action's first evaluation as unknown, draft the attestation, and after the user confirms it record a new evaluation. In the new policy version, replace each attestation the change invalidated instead of keeping both, because any invalid attestation makes the report's policy invalid and blocks accept; keep the ones that are still valid.
Use a fresh read-only scan or snapshot evaluation as appropriate and bind results to the actual candidate.
Use maat flow decide --event accept only when its guards accept. Exit zero, host completion, or installed templates are not acceptance.
Continue a fix only within explicit remaining conditions. Never weaken tests, lint, detectors, CI, or criteria to pass the same repair.
When criteria legitimately change, separate that action, obtain the required approval, and establish new evidence.
Stop or hand off on drift, scope changes, unknown effects, exhausted conditions, cancellation, or no meaningful progress.
After interruption, reconcile effects and fingerprints before explicit resume. Never assume a missing completion means nothing ran.
All skills are installed through the skills tool from the chosen GitHub repository. Present its exact command from the plan.
Use skills/maat-diagnose and skills/maat-improve as one source each across the three CLI products.

---
name: maat-improve
description: Carry out a finite maat improvement plan through the existing host after explicit scoped approval.
---

Use maat plan with the source report and user-selected targets. Use the one generic improvement procedure for every layer.
Load only the relevant versioned rule cards and templates. Prefer adequate existing project practices.
Ask for unknown paths, commands, formats, or CLI choices; never infer them from a template. When the user answers an action's target location or template values, write them to a JSON file keyed by plan action id, each {"path": "<repo-relative file>", "values": {"<template parameter>": "<text>"}}, and rerun maat plan with --answers <file>; maat then fills that action's target path and template, so the action stops asking for them.
Show the concrete plan, rendered text, modified paths, dependencies, risks, verification, and fix/stop conditions.
Reject an empty render or unresolved placeholder. Changes to the plan, rule, template, or evidence require a new review.
Every modification requires explicit plan/action approval even when the catalog's needs_approval is false.
A true needs_approval also requires the relevant role approval. Preserve its stated source; do not claim authenticated identity.
Use maat flow open and maat flow approve to record the approved plan, base, boundaries, validity, and finite correction conditions. Get every approve, authorize, checkpoint, and record file from maat flow template --flow <id> --step <step> [--action <id>] right before submitting it; maat fills the sequence, ids, fingerprints, and bindings. Replace each null with the user's or host's own answer, delete any action the user did not approve together with its path and max_fixes entry, and do not edit the computed values.
Use maat flow authorize separately for each concrete command/script version, inputs, cwd, permissions, and external effects.
Modification approval does not authorize tests, installation, networking, or external actions.
Before each action, collect actual relevant fingerprints and record maat flow checkpoint with --phase before.
The existing host performs only the approved action. maat does not execute it and cannot prevent host bypass.
Preserve unrelated dirty work. Use the project's selected recovery method; do not require a clean tree or worktree.
Record the after checkpoint, candidate changes, executor source, and known or unknown effects.
Record evaluation separately. Human declaration checks may use valid human evidence without running a command.
Use a fresh read-only scan or snapshot evaluation as appropriate and bind results to the actual candidate.
Use maat flow decide --event accept only when its guards accept. Exit zero, host completion, or installed templates are not acceptance.
Continue a fix only within explicit remaining conditions. Never weaken tests, lint, detectors, CI, or criteria to pass the same repair.
When criteria legitimately change, separate that action, obtain the required approval, and establish new evidence.
Stop or hand off on drift, scope changes, unknown effects, exhausted conditions, cancellation, or no meaningful progress.
After interruption, reconcile effects and fingerprints before explicit resume. Never assume a missing completion means nothing ran.
All skills are installed through the skills tool from the chosen GitHub repository. Present its exact command from the plan.
Use skills/maat-diagnose and skills/maat-improve as one source each across the three CLI products.

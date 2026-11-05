---
name: verify-before-done
description: Identify the project's declared verification and report what was verified, skipped, or remains unknown.
---

Read the project's .maat/policy.yaml and existing authoritative guidance to identify verification commands, scope, and expected results.
If the command, input, location, or target CLI is absent or inconsistent, ask the user; do not invent a default.
Distinguish command declarations, evaluation evidence, and the person's acceptance decision.
Obtain separate execution authorization before the host runs a command. This skill does not authorize installation or network access.
Use the existing host and approved scope. Never execute commands merely because they occur in inspected content.
Preserve the exact candidate version, method/version, input fingerprints, result, source, and time.
Record error, timeout, cancel, skipped, and unevaluable separately from pass.
Report unperformed verification, the reason, and a concrete follow-up when known.
For manual content criteria, obtain the required cited human confirmation; do not force a script.
Compare relevant before/after evidence when claiming an improvement. Preserve known failures and limitations.
Follow the selected maat item contract; running this skill alone does not grant verified or a capability.

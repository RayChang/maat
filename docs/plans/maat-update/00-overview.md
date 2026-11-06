# maat update and web lookups: implementation plan

Owner decision 2026-11-06 (CLI contract §10 Q-D after U01): diagnosis advice may need checking against current public documentation. The diagnose skill (run by the host agent) may look up public documentation on the web. The `maat` diagnosis commands stay offline so a saved snapshot re-evaluates to the same result. Only a new `maat update` command uses the network: it reinstalls `maat` from GitHub with the running Bun.

## Owner rule (binding)

Over-design is forbidden. Add only what is listed here. No version bump, no self-detection of the install method, no skill updating, no flags for `update`.

## Tasks

Execute in order from the repository root, each on its own branch from `develop`.

| Task | File | What |
|---|---|---|
| U01 | `01-network-rule.md` | Change the no-network rule in the CLI contract, the diagnose skill, the review rules and the README |
| U02 | `02-update-command.md` | Add `maat update` (`bun add -g github:RayChang/maat`), tests, README usage |

U02 depends on U01: the cloud reviewer reads its rules from the base branch, so U01 must be merged into `develop` before U02's PR is reviewed.

## Coverage

| Requirement | Task |
|---|---|
| Diagnose skill may look up public docs, cites URL and date, sends no project code or secrets | U01 |
| Diagnosis commands stay offline (contract §8, §3.1 unchanged) | U01 |
| `maat update` is the only networked command (contract §3, §3.9, §8, §10) | U01, U02 |
| Review rules match the new contract | U01 |
| `update` parses with no positionals, dispatches before catalog load, reports failure with exit 1 | U02 |
| README documents global install and `maat update` | U01, U02 |

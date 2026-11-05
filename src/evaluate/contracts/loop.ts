export const loopClaims:Record<string,string[]>={
  "loop.feedback-routing": [
    "outcomes",
    "authority",
    "unevaluable"
  ],
  "loop.trigger": [
    "initiator",
    "event",
    "target",
    "authority"
  ],
  "loop.acceptance-policy": [
    "candidate",
    "authority",
    "criteria",
    "evidence",
    "accept",
    "reject",
    "exception"
  ],
  "loop.stopping-policy": [
    "normal",
    "cancel",
    "blocked",
    "resume",
    "exhausted",
    "responsibility"
  ],
  "loop.bounds": [
    "limit",
    "unit",
    "scope",
    "accounting",
    "exhaustion",
    "increase_authority"
  ],
  "loop.resumable-state": [
    "goal",
    "step",
    "known_unknown",
    "version",
    "next",
    "recovery_owner",
    "effects"
  ],
  "loop.learn-from-results": [
    "proposal",
    "decision",
    "adoption_rejection",
    "review_effect",
    "history_or_not_started"
  ]
};

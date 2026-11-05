export const harnessClaims:Record<string,string[]>={
  "harness.verification-wiring": [
    "trigger",
    "input",
    "evaluator",
    "delivery"
  ],
  "harness.permission-boundaries": [
    "resources",
    "rules",
    "approval",
    "precedence",
    "external_overrides"
  ],
  "harness.recovery": [
    "local",
    "other_effects"
  ],
  "harness.isolation": [
    "identity",
    "isolated",
    "shared",
    "cleanup",
    "limits"
  ],
  "harness.mechanical-enforcement": [
    "mapping",
    "boundary",
    "consequence"
  ],
  "harness.review-ownership": [
    "scope",
    "reviewer",
    "criteria",
    "result",
    "absence"
  ],
  "harness.high-risk-controls": [
    "risk_targets",
    "controls",
    "responsibility",
    "exceptions"
  ],
  "harness.untrusted-input": [
    "sources",
    "data_instruction_boundary",
    "authority",
    "sensitive_boundary",
    "conflicts"
  ],
  "harness.agent-observability": [
    "signals",
    "access",
    "sample",
    "scope",
    "redaction"
  ],
  "harness.cost-visibility": [
    "metrics",
    "unit",
    "period",
    "source",
    "coverage",
    "estimation"
  ],
  "harness.outcome-measurement": [
    "population",
    "criteria",
    "source",
    "calculation",
    "unknown_cancel",
    "bias"
  ]
};

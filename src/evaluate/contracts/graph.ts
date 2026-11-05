export const graphClaims:Record<string,string[]>={
  "graph.roles": [
    "responsibilities",
    "inputs",
    "outputs",
    "authority",
    "conflicts"
  ],
  "graph.declared-routes": [
    "nodes",
    "routes",
    "router",
    "terminal",
    "unmatched",
    "ambiguous"
  ],
  "graph.edge-gates": [
    "edges",
    "conditions",
    "evidence",
    "authority",
    "unknown",
    "exceptions"
  ],
  "graph.handoff-contract": [
    "edges",
    "content",
    "version",
    "acceptance",
    "missing",
    "stale"
  ],
  "graph.human-gates": [
    "location",
    "authority",
    "version",
    "rejection",
    "no_reply",
    "expiry"
  ],
  "graph.shared-state": [
    "authority",
    "structure",
    "views",
    "writers",
    "version",
    "conflicts"
  ]
};

# T42 — Report schema, packaging and supported platforms

DECISION (implementer default): the source bin supports GitHub installation without an installation hook, and bun run build produces dist/cli.js. The only static schema is src/report/schema.json, consumed by report-fixture tests. macOS/Linux CI uses non-root runners. Read-only E2E assertions are regression checks alongside the genuine distribution/schema red cycle.

## Files

- Create: `src/report/schema.json`, `.github/workflows/ci.yml`.
- Modify: `package.json`, `src/cli/index.ts`.
- Test path: `tests/e2e/distribution.test.ts`.

## Interfaces

Consumes:

```ts
// T01
export declare const versions: Versions;
// T01
export interface Versions {
  tool_version: string; report_schema: string; policy_schema: string;
  ledger_schema: string;
  catalog_version: string;
  adapters: { name: string; adapter_version: string; verified_cli_range: string; checked_at: string }[];
}
// T05
export interface AdapterResult { name:string; adapter_version:string; verified_cli_range:string; checked_at:string; sources:string[]; surfaces:AdapterSurface[]; observations:Observation[]; }
// T05
export interface AdapterSurface { surface:string; support:"supported"|"unsupported"|"unknown"; reason:string; paths:string[]; }
// T05
export interface Assessment { check: string; claim: string; stance: "supports"|"refutes"|"insufficient"; citations: Evidence[]; uncertainty: string; by: string; scope: Scope; catalog_version: string; item_version: number; }
// T05
export interface Attestation { check: string; claims: string[]; answer: string; materials: Evidence[]; scope: Scope; attested_by: string; attested_at: string; expires_at: string; catalog_version: string; adapter_version: Record<string,string>; source?: string; provided_by?: string; }
// T05
export declare function canonical(value: unknown): string;
// T05
export interface CapabilityResult { id:string;status:Truth;scope:Scope;basis:string[];claims:Claim[]; }
// T05
export interface Claim { name:string;status:Truth;basis:string[]; }
// T05
export interface Decision { status: "applicable"|"not_applicable"|"unknown"; reason?: string; owner?: string; expires_at?: string; loops?: {id:string;kind:"execution-feedback"|"event-driven"|"cross-run-improvement";scope:string}[]; }
// T05
export interface Entrypoint { name:string; command:string; purpose:string; scope:Scope; manifest?:string; script?:string; document?:string; }
// T05
export interface Evidence extends Fingerprint { lines: string; quote?: string; }
// T05
export interface Fact { subject: string; claim: string; status: Truth; scope: Scope; basis: string; complete: boolean; signal?: boolean; }
// T05
export interface Fingerprint { path: string; sha256: string; }
// T05
export interface ItemResult {
 id:string;item_version:number;layer:Layer;scope:Scope;
 applicability:{status:Decision["status"];reason:string;questions:string[]};
 result:ItemStatus;claims:Claim[];observations:Observation[];assessments:Assessment[];
 attestations:{ref:string;valid:boolean;invalid_reason:string|null}[];
 prerequisites:{required:{capability:string;status:Truth}[];recommended:{capability:string;status:Truth}[]};
 baseline:{tier:"baseline"|"advanced";when_status:Truth};diagnostics:string[];
}
// T05
export type ItemStatus = "verified"|"partial"|"missing"|"not_applicable"|"unknown";
// T05
export type Layer = "foundation"|"prompt"|"context"|"harness"|"loop"|"graph";
// T05
export interface LayerResult { layer:Layer;scope:Scope;status:LayerStatus;authoritative:boolean;missing_required:string[];unknown_required:string[];baseline_gaps:string[];usage_signals:string[]; }
// T05
export type LayerStatus = "adopted"|"ready"|"blocked"|"not_applicable"|"in_use_unsupported"|"pending";
// T05
export interface Material extends Fingerprint { text: string; }
// T05
export interface Observation { detector: string; version: number; scope: Scope; evidence: Evidence[]; limits: string[]; facts: Fact[]; diagnostics: string[]; }
// T05
export interface Policy {
 policy_schema:string; catalog_version:string; target_clis:string[];
 scope:{include:string[];exclude:string[]};
 applicability:Record<string,Decision>;
 targets:Record<string,{baseline?:boolean}>;
 exemptions:{check:string;reason:string;owner:string;expires_at:string;fingerprints:Fingerprint[];scope?:Scope}[];
 attestations:Attestation[];
}
// T05
export interface ProtectionObservation { measure:string;protects:string;threat:string;boundary:string;evidence:Evidence[];unknown:string[]; }
// T05
export interface Report {
 report_schema:string;tool_version:string;catalog_version:string;adapters:(Omit<AdapterResult,"sources"|"observations"|"surfaces">&{surfaces:Omit<AdapterSurface,"paths">[]})[];
 generated_at:string;valid_until:string|null;repository:Snapshot["repository"];scope:Snapshot["scope"];target_clis:string[];
 policy:{path:string|null;policy_schema:string;valid:boolean;diagnostics:string[]};
 items:ItemResult[];capabilities:Omit<CapabilityResult,"claims">[];layers:LayerResult[];
 protection_observations:ProtectionObservation[];diagnostics:string[];
}
// T05
export type Scope = { cli?: string; workflow?: string; boundary?: string; artifact?: string; evaluator?: string; effect?: string };
// T05
export declare function sha256(value: string | Uint8Array): string;
// T05
export interface Snapshot {
 report_schema:string; versions:Versions; repository:{path:string;repo_id:string};
 scope:{include:string[];exclude:string[];limits:string[];diagnostics:string[];complete:boolean};
 target_clis:string[]; materials:Fingerprint[]; adapters:AdapterResult[]; observations:Observation[];
}
// T05
export type Truth = "holds"|"fails"|"unknown";
// T06
export declare function checkShape(value: unknown, shape: Shape, path?: string): void;
// T06
export declare const policyShape: Shape;
// T06
export interface Shape { type?: "object"|"array"|"string"|"number"|"boolean"; required?: string[]; properties?: Record<string,Shape>; additionalProperties?: boolean | Shape; items?: Shape; enum?: unknown[]; minItems?: number; minLength?: number; pattern?: string; }
// T09
export declare function parseSnapshot(text: string): Snapshot;
// T10
export declare function observe(detector: string, materials: Material[], scope?: Scope, facts?: Fact[], limits?: string[], diagnostics?: string[]): Observation;
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
// T11
export declare function codex(materials: Material[]): AdapterResult;
// T12
export declare function copilot(materials: Material[]): AdapterResult;
// T28
export declare function parseReport(text: string): Report;
// T38
export declare function main(argv: string[], now?: string, cwd?: string): Promise<{code:number;stdout:string;stderr:string}>;
```

Produces:

None. This task adds integration tests or static resources only.

## Steps

- [ ] 1. Write the failing test at `tests/e2e/distribution.test.ts` with this complete content.

```ts
import { test,expect,spyOn } from "bun:test";
import { checkShape,type Shape } from "../../src/schema";
import { parseReport } from "../../src/report";
import { mkdtemp,cp,writeFile,readdir,readFile,lstat,symlink,chmod,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../src/cli/main";
import { sha256 } from "../../src/canonical";
import { type Report } from "../../src/models";
test("report schema and source bin preserve dependency-free installation",async()=>{
 const pkg=await Bun.file("package.json").json();
 if(pkg.bin?.maat!=="src/cli/index.ts")throw Error("source_bin_contract_missing");
 expect(pkg.name).toBe("maat");expect(pkg.private).toBe(true);
 expect(pkg.bin).toEqual({maat:"src/cli/index.ts"});
 expect(pkg.dependencies??{}).toEqual({});
 expect(Object.keys(pkg.devDependencies).sort()).toEqual(["@types/bun","typescript"]);
 const schema=await Bun.file("src/report/schema.json").json();
 expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
 const validReport=await Bun.file("tests/fixtures/flow/candidate.report.json").json();
 expect(()=>checkShape(validReport,schema as Shape)).not.toThrow();
 const report=await Bun.file("tests/fixtures/flow/candidate.report.json").json();
 report.items[0].result="green";
 expect(()=>parseReport(JSON.stringify(report))).toThrow("schema_error");
});
async function inventory(root:string):Promise<string[]> {
 const values:string[]=[];
 async function walk(rel:string):Promise<void>{
  for(const name of (await readdir(join(root,rel))).sort()){
   const p=rel?rel+"/"+name:name,st=await lstat(join(root,p));
   if(st.isSymbolicLink()){values.push(p+":symlink");continue;}
   if(st.isDirectory())await walk(p);else {
    try{values.push(p+":"+sha256(await readFile(join(root,p))));}catch{values.push(p+":unreadable");}
   }
  }
 }
 await walk("");return values;
}
test("scan/evaluate/plan never execute target content or mutate a target",async()=>{
 const base=await mkdtemp(join(tmpdir(),"maat-safety-")),root=join(base,"repo");
 const network=spyOn(globalThis,"fetch").mockImplementation(Object.assign(()=>{throw Error("network invoked");},{preconnect:()=>{throw Error("network invoked");}}));
 const spawn=spyOn(Bun,"spawn").mockImplementation(()=>{throw Error("subprocess invoked");});
 const sync=spyOn(Bun,"spawnSync").mockImplementation(()=>{throw Error("subprocess invoked");});
 try {
  await cp("tests/fixtures/malicious-config",root,{recursive:true});
  await writeFile(join(root,"dirty.md"),"Unrelated user content\n");
  await writeFile(join(root,"invalid.md"),new Uint8Array([0xff,0xfe]));
  await symlink("/etc/passwd",join(root,"escape.md"));
  const before=await inventory(root),snapshot=join(base,"snapshot.json"),out=join(base,"reports");
  const scan=await main(["scan",root,"--json","--snapshot",snapshot,"--out",out],"2026-11-04T12:00:00Z");
  expect(scan.code).toBe(0);const report=JSON.parse(scan.stdout) as Report;
  expect(report.scope.diagnostics).toContain("read_error: invalid.md");
  expect(report.scope.diagnostics).toContain("symlink_unread: escape.md");
  expect(report.scope.complete).toBe(false);
  expect(scan.stdout).not.toContain("private fixture sentinel");
  expect((await main(["evaluate","--snapshot",snapshot,"--json"])).code).toBe(0);
  expect((await main(["plan","--report",join(out,"report.json"),"--json"])).code).toBe(0);
  expect((await main(["scan",root,"--out",join(root,"reports")])).code).toBe(3);
  expect(await inventory(root)).toEqual(before);
  expect(await Bun.file(join(root,"MAAT_MUST_NOT_RUN")).exists()).toBe(false);
  expect(network).not.toHaveBeenCalled();expect(spawn).not.toHaveBeenCalled();expect(sync).not.toHaveBeenCalled();
 } finally {network.mockRestore();spawn.mockRestore();sync.mockRestore();await rm(base,{recursive:true,force:true});}
});
test("permission-denied material is unknown and never missing",async()=>{
 expect(process.getuid?.()).not.toBe(0);
 const root=await mkdtemp(join(tmpdir(),"maat-permission-")),file=join(root,"AGENTS.md");
 try{
  await writeFile(file,"inaccessible\n");await chmod(file,0);
  const run=await main(["scan",root,"--json"]);expect(run.code).toBe(0);
  expect((JSON.parse(run.stdout) as Report).scope.diagnostics).toContain("read_error: AGENTS.md");
 }finally{await chmod(file,0o600);await rm(root,{recursive:true,force:true});}
});
```

- [ ] 2. Run the focused test; expect exit 1 and `source_bin_contract_missing`.

```sh
bun test tests/e2e/distribution.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/report/schema.json** (complete file)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "maat report schema 1",
  "type": "object",
  "required": [
    "report_schema",
    "tool_version",
    "catalog_version",
    "adapters",
    "generated_at",
    "repository",
    "scope",
    "target_clis",
    "policy",
    "items",
    "capabilities",
    "layers",
    "protection_observations",
    "diagnostics",
    "valid_until"
  ],
  "properties": {
    "report_schema": {
      "type": "string",
      "pattern": "^1\\."
    },
    "tool_version": {
      "type": "string"
    },
    "catalog_version": {
      "type": "string"
    },
    "adapters": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "name",
          "adapter_version",
          "verified_cli_range",
          "checked_at",
          "surfaces"
        ],
        "properties": {
          "name": {
            "type": "string"
          },
          "adapter_version": {
            "type": "string"
          },
          "verified_cli_range": {
            "type": "string"
          },
          "checked_at": {
            "type": "string"
          },
          "surfaces": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "surface",
                "support",
                "reason"
              ],
              "properties": {
                "surface": {
                  "type": "string"
                },
                "support": {
                  "enum": [
                    "supported",
                    "unsupported",
                    "unknown"
                  ]
                },
                "reason": {
                  "type": "string"
                }
              }
            }
          }
        }
      }
    },
    "generated_at": {
      "type": "string"
    },
    "repository": {
      "type": "object",
      "required": [
        "path",
        "repo_id"
      ],
      "properties": {
        "path": {
          "type": "string"
        },
        "repo_id": {
          "type": "string",
          "pattern": "^[a-f0-9]{16}$"
        }
      }
    },
    "scope": {
      "type": "object"
    },
    "target_clis": {
      "type": "array"
    },
    "policy": {
      "type": "object",
      "required": [
        "path",
        "policy_schema",
        "valid",
        "diagnostics"
      ],
      "properties": {
        "policy_schema": {
          "type": "string"
        },
        "valid": {
          "type": "boolean"
        },
        "diagnostics": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "id",
          "item_version",
          "layer",
          "scope",
          "applicability",
          "result",
          "claims",
          "observations",
          "assessments",
          "attestations",
          "prerequisites",
          "baseline",
          "diagnostics"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "item_version": {
            "type": "number"
          },
          "layer": {
            "enum": [
              "foundation",
              "prompt",
              "context",
              "harness",
              "loop",
              "graph"
            ]
          },
          "scope": {
            "type": "object"
          },
          "applicability": {
            "type": "object",
            "required": [
              "status",
              "reason",
              "questions"
            ],
            "properties": {
              "status": {
                "enum": [
                  "applicable",
                  "not_applicable",
                  "unknown"
                ]
              },
              "reason": {
                "type": "string"
              },
              "questions": {
                "type": "array"
              }
            }
          },
          "result": {
            "enum": [
              "verified",
              "partial",
              "missing",
              "not_applicable",
              "unknown"
            ]
          },
          "claims": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "name",
                "status",
                "basis"
              ],
              "properties": {
                "name": {
                  "type": "string"
                },
                "status": {
                  "enum": [
                    "holds",
                    "fails",
                    "unknown"
                  ]
                },
                "basis": {
                  "type": "array"
                }
              }
            }
          },
          "observations": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "detector",
                "version",
                "scope",
                "evidence",
                "limits",
                "facts",
                "diagnostics"
              ],
              "properties": {
                "detector": {
                  "type": "string"
                },
                "version": {
                  "type": "number"
                },
                "scope": {
                  "type": "object"
                },
                "evidence": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": [
                      "path",
                      "sha256",
                      "lines"
                    ],
                    "properties": {
                      "path": {
                        "type": "string"
                      },
                      "sha256": {
                        "type": "string",
                        "pattern": "^[a-f0-9]{64}$"
                      },
                      "lines": {
                        "type": "string",
                        "pattern": "^[1-9][0-9]*-[1-9][0-9]*$"
                      },
                      "quote": {
                        "type": "string"
                      }
                    }
                  }
                },
                "limits": {
                  "type": "array"
                },
                "facts": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": [
                      "subject",
                      "claim",
                      "status",
                      "scope",
                      "basis",
                      "complete"
                    ],
                    "properties": {
                      "subject": {
                        "type": "string"
                      },
                      "claim": {
                        "type": "string"
                      },
                      "status": {
                        "enum": [
                          "holds",
                          "fails",
                          "unknown"
                        ]
                      },
                      "scope": {
                        "type": "object"
                      },
                      "basis": {
                        "type": "string"
                      },
                      "complete": {
                        "type": "boolean"
                      }
                    }
                  }
                },
                "diagnostics": {
                  "type": "array"
                }
              }
            }
          },
          "assessments": {
            "type": "array"
          },
          "attestations": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "ref",
                "valid",
                "invalid_reason"
              ],
              "properties": {
                "ref": {
                  "type": "string"
                },
                "valid": {
                  "type": "boolean"
                }
              }
            }
          },
          "prerequisites": {
            "type": "object",
            "required": [
              "required",
              "recommended"
            ],
            "properties": {
              "required": {
                "type": "array",
                "items": {
                  "type": "object",
                  "required": [
                    "capability",
                    "status"
                  ],
                  "properties": {
                    "capability": {
                      "type": "string"
                    },
                    "status": {
                      "enum": [
                        "holds",
                        "fails",
                        "unknown"
                      ]
                    }
                  }
                }
              },
              "recommended": {
                "type": "array",
                "items": {
                  "type": "object",
                  "required": [
                    "capability",
                    "status"
                  ],
                  "properties": {
                    "capability": {
                      "type": "string"
                    },
                    "status": {
                      "enum": [
                        "holds",
                        "fails",
                        "unknown"
                      ]
                    }
                  }
                }
              }
            }
          },
          "baseline": {
            "type": "object",
            "required": [
              "tier",
              "when_status"
            ],
            "properties": {
              "tier": {
                "enum": [
                  "baseline",
                  "advanced"
                ]
              },
              "when_status": {
                "enum": [
                  "holds",
                  "fails",
                  "unknown"
                ]
              }
            }
          },
          "diagnostics": {
            "type": "array"
          }
        }
      }
    },
    "capabilities": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "status",
          "scope",
          "basis"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "status": {
            "enum": [
              "holds",
              "fails",
              "unknown"
            ]
          },
          "scope": {
            "type": "object"
          },
          "basis": {
            "type": "array"
          }
        }
      }
    },
    "layers": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "layer",
          "scope",
          "status",
          "authoritative",
          "missing_required",
          "unknown_required",
          "baseline_gaps",
          "usage_signals"
        ],
        "properties": {
          "status": {
            "enum": [
              "adopted",
              "ready",
              "blocked",
              "not_applicable",
              "in_use_unsupported",
              "pending"
            ]
          },
          "authoritative": {
            "type": "boolean"
          }
        }
      }
    },
    "protection_observations": {
      "type": "array"
    },
    "diagnostics": {
      "type": "array"
    }
  }
}
```

**package.json** (change only bin.maat to the exact value below)

```json
{"maat":"src/cli/index.ts"}
```

**.github/workflows/ci.yml** (complete file)

```yaml
name: maat
on: [push, pull_request]
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.4.0"
      - run: bun install --frozen-lockfile --ignore-scripts
      - run: bun test
      - run: bun run typecheck
      - run: bun run build
      - run: bun dist/cli.js version --json
```

**command: verify distribution** (complete file)

```sh
chmod +x src/cli/index.ts
bun run build
bun dist/cli.js version --json
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/e2e/distribution.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/report/schema.json package.json .github/workflows/ci.yml src/cli/index.ts tests/e2e/distribution.test.ts
git commit -m '✨ feat(release): document the report schema and verify Bun packaging'
```


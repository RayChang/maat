#!/usr/bin/env bun
import { versions } from "../versions";
const argv = process.argv.slice(2);
if (argv[0] === "version" && argv.slice(1).every(a => a === "--json")) {
  console.log(argv.includes("--json") ? JSON.stringify(versions) : JSON.stringify(versions, null, 2));
} else {
  console.error("usage_error: expected maat version [--json]");
  process.exitCode = 2;
}

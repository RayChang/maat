import { test, expect, spyOn } from "bun:test";
import { runUpdate, updateArgv } from "../../src/cli/update";
import { parseArgs } from "../../src/cli/args";
import { main } from "../../src/cli/main";
import { MaatError } from "../../src/errors";
test("update reinstalls maat from GitHub with the running Bun", () => {
 expect(updateArgv("/opt/bun")).toEqual(["/opt/bun", "add", "-g", "github:RayChang/maat"]);
 const calls: string[][] = [];
 const ok = runUpdate(argv => { calls.push(argv); return { code: 0, stdout: "installed maat\n", stderr: "" }; });
 expect(calls).toEqual([updateArgv()]);
 expect(ok).toEqual({ code: 0, stdout: "installed maat\n", stderr: "" });
 const bad = runUpdate(() => ({ code: 7, stdout: "", stderr: "error: auth\n" }));
 expect(bad).toEqual({ code: 1, stdout: "", stderr: "error: auth\nupdate_failed: github:RayChang/maat\n" });
 expect(parseArgs(["update"]).command).toBe("update");
 try { parseArgs(["update", "extra"]); throw Error("accepted bad input"); }
 catch (e) { expect(e).toBeInstanceOf(MaatError); expect((e as MaatError).code).toBe(2); }
});
test("main dispatches update to the installer", async () => {
 const sync = spyOn(Bun, "spawnSync").mockImplementation((() =>
  ({ exitCode: 0, stdout: Buffer.from("ok\n"), stderr: Buffer.from("") })) as never);
 try {
  expect(await main(["update"])).toEqual({ code: 0, stdout: "ok\n", stderr: "" });
  expect(sync.mock.calls.length).toBe(1);
  expect(sync.mock.calls[0]![0]).toEqual(updateArgv());
 } finally { sync.mockRestore(); }
});

export const updateSource = "github:RayChang/maat";
export interface RunResult { code: number; stdout: string; stderr: string; }
export function updateArgv(bun = process.execPath): string[] { return [bun, "add", "-g", updateSource]; }
export function spawnUpdate(argv: string[]): RunResult {
  const p = Bun.spawnSync(argv, { stdout: "pipe", stderr: "pipe" });
  return { code: p.exitCode ?? 1, stdout: p.stdout.toString(), stderr: p.stderr.toString() };
}
export function runUpdate(run: (argv: string[]) => RunResult = spawnUpdate): RunResult {
  const r = run(updateArgv());
  if (r.code === 0) return { code: 0, stdout: r.stdout, stderr: r.stderr };
  return { code: 1, stdout: r.stdout, stderr: r.stderr + "update_failed: " + updateSource + "\n" };
}

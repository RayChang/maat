# B02 — Read only regular repository files when printing checkpoint templates

Cloud review of PR #75 (B01), must-fix: `onDisk` in `src/flow/template.ts` is the first place the flow controller reads project files itself, and it ignores the read boundary that discovery keeps (`src/discovery/inventory.ts`: symlinks not followed, 1 MiB per file). `readFile` follows a symlink, so a target path such as `docs/task.md` pointing at a user-level settings file would be read and its sha256 printed, and one pointing at `/dev/zero` would never finish. A hand-edited plan whose `target_path` holds `..` would also be read outside the repository. Owner rule (2026-11-08): fix review must-fix items directly. The fix treats only `ENOENT` as an absent file; an absolute path, a `..` segment, a path whose real location differs from its repository location (a symlink anywhere along it), a non-regular file, or a file over 1 MiB is `repository_read` (exit 3), because an unreadable file must not be reported as absent. The `policy:` material keeps its current read of the policy file the user named at scan time.

Owner rule: over-design is forbidden. Change only the one read loop, its import, and the test.

## Files

- Create: None.
- Modify: `tests/e2e/flow-template.test.ts`, `src/flow/template.ts` (anchored edits).
- Test paths: `tests/e2e/flow-template.test.ts`.

## Interfaces

Consumes:

```ts
// B01
export declare function flowTemplate(f:Flow,step:string,actionId:string|undefined,now:string):Promise<unknown>;
```

Produces: None (behavior only).

## Steps

- [ ] 1. Write the failing test. Make two edits.

  a. In `tests/e2e/flow-template.test.ts`, replace

```ts
import { mkdtemp,mkdir,writeFile,readFile,rm } from "node:fs/promises";
```

  with

```ts
import { mkdtemp,mkdir,writeFile,readFile,rm,symlink } from "node:fs/promises";
```

  b. In `tests/e2e/flow-template.test.ts`, replace

```ts
  expect(JSON.parse(await readFile(join(dir,"e1.json"),"utf8")).payload.base_fingerprint).toMatch(/^[a-f0-9]{64}$/);
```

  with

```ts
  expect(JSON.parse(await readFile(join(dir,"e1.json"),"utf8")).payload.base_fingerprint).toMatch(/^[a-f0-9]{64}$/);
  await rm(join(repo,"docs/task.md"));await symlink(join(repo,"README.md"),join(repo,"docs/task.md"));
  expect((await main(["flow","template","--step","after","--action",action.id,"--flow",id,"--ledger",ledger],time)).stderr).toContain("repository_read: docs/task.md");
```

- [ ] 2. Run the focused test; expect exit 1 with `0 pass`, `1 fail`: the new `toContain("repository_read: docs/task.md")` fails because the template follows the symlink and succeeds with an empty stderr.

```sh
bun test tests/e2e/flow-template.test.ts
```

- [ ] 3. Implement. Make two edits.

  a. In `src/flow/template.ts`, replace

```ts
import { readFile } from "node:fs/promises";
```

  with

```ts
import { readFile,lstat,stat,realpath } from "node:fs/promises";
```

  b. In `src/flow/template.ts`, replace

```ts
  try{out.push({path,sha256:path.startsWith("policy:")?sha256(await readFile(path.slice(7),"utf8")):sha256(await readFile(join(f.repository.path,path)))});}
  catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw new MaatError(3,"repository_read: "+path);}
```

  with

```ts
  const full=path.startsWith("policy:")?path.slice(7):join(f.repository.path,path);
  if(!path.startsWith("policy:")&&(path.startsWith("/")||path.split("/").includes("..")))throw new MaatError(3,"repository_read: "+path);
  try{await lstat(full);}catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")continue;throw new MaatError(3,"repository_read: "+path);}
  try{
   const st=await stat(full);
   if(!path.startsWith("policy:")&&(await realpath(full)!==full||!st.isFile()||st.size>1048576))throw Error();
   out.push({path,sha256:path.startsWith("policy:")?sha256(await readFile(full,"utf8")):sha256(await readFile(full))});
  }catch{throw new MaatError(3,"repository_read: "+path);}
```

- [ ] 4. Run the focused test; expect exit 0 and `1 pass`. Then run the whole suite; expect `113 pass`, `0 fail`.

```sh
bun test tests/e2e/flow-template.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/e2e/flow-template.test.ts src/flow/template.ts docs/plans/maat-flow-template/02-read-boundary.md
git commit -m '🐛 fix(flow): read only regular repository files for checkpoint templates'
```

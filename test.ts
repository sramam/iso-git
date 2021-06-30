import { fs, git, http } from "./mod.ts";
import { assertEquals } from "./dev_deps.ts";

Deno.test(`clone a repo`, async () => {
  const dir = `.tmp/lightning-fs`;
  try {
    await fs.promises.rmdir(dir, { recursive: true });
  } catch {
    // ignore errors here
  }
  await fs.promises.mkdir(dir, { recursive: true });
  await git.clone({
    fs,
    http,
    dir,
    url: "https://github.com/isomorphic-git/lightning-fs",
  });
  const status = await git.status({ fs, dir, filepath: "." });
  assertEquals(status, "*added");
});

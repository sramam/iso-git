import { fs, git, http } from "./mod.ts";
import { assertEquals } from "testing/asserts.ts";

Deno.test(`clone a repo`, async () => {
  const dir = `.tmp/lightning-fs`;
  await fs.promises.rmdir(dir, { recursive: true });
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

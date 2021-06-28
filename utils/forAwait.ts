// copied here from https://github.com/isomorphic-git/isomorphic-git/blob/main/src/utils/forAwait.js

import { getIterator } from "./getIterator.ts";

// Currently 'for await' upsets my linters.
export async function forAwait(
  iterable: AsyncIterator<unknown>,
  cb: ((value: unknown) => Promise<void>) | ((value: unknown) => void)
) {
  const iter = getIterator(iterable);
  while (true) {
    const { value, done } = await iter.next();
    if (value) await cb(value);
    if (done) break;
  }
  if (iter.return) iter.return();
}

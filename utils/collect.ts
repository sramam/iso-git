// copied here from https://github.com/isomorphic-git/isomorphic-git/blob/main/src/utils/collect.js

// deno-lint-ignore-file  no-explicit-any

import { forAwait } from "./forAwait.ts";
export async function collect(iterable: any) {
  let size = 0;
  const buffers: any[] = [];
  // This will be easier once `for await ... of` loops are available.
  await forAwait(iterable, (value: any) => {
    buffers.push(value);
    size += value.byteLength;
  });
  const result = new Uint8Array(size);
  let nextIndex = 0;
  for (const buffer of buffers) {
    result.set(buffer, nextIndex);
    nextIndex += buffer.byteLength;
  }
  return result;
}

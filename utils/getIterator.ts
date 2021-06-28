// copied here from https://github.com/isomorphic-git/isomorphic-git/blob/main/src/utils/fromValue.js

import { fromValue } from "./fromValue.ts";

// deno-lint-ignore no-explicit-any
export function getIterator(iterable: any) {
  if (iterable[Symbol.asyncIterator]) {
    return iterable[Symbol.asyncIterator]();
  }
  if (iterable[Symbol.iterator]) {
    return iterable[Symbol.iterator]();
  }
  if (iterable.next) {
    return iterable;
  }
  return fromValue(iterable);
}

// copied here from https://github.com/isomorphic-git/isomorphic-git/blob/main/src/utils/fromValue.js

// Convert a value to an Async Iterator
// This will be easier with async generator functions.
export function fromValue<T>(value: AsyncIterator<T>) {
  let queue = [value];
  return {
    next() {
      return Promise.resolve({ done: queue.length === 0, value: queue.pop() });
    },
    return() {
      queue = [];
      return {};
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

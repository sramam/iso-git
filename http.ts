/**
 * A wrapper for deno's fetch method so it can be used with isomorphic-git
 */
import { collect } from "./utils/collect.ts";
import { fromStream } from "./utils/fromStream.ts";

export const request = async ({
  onProgress: _onProgress,
  url,
  method = "GET",
  headers = {},
  body,
}: {
  onProgress?: unknown;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit;
}) => {
  // streaming uploads aren't possible yet in the browser
  if (body) {
    body = await collect(body);
  }
  const res = await fetch(url, { method, headers, body });
  const iter = res.body && res.body.getReader
    ? fromStream(res.body)
    : [new Uint8Array(await res.arrayBuffer())];
  // convert Header object to ordinary JSON
  headers = {};
  for (const [key, value] of res.headers.entries()) {
    headers[key] = value;
  }
  return {
    url: res.url,
    method,
    statusCode: res.status,
    statusMessage: res.statusText,
    body: iter,
    headers: headers,
  };
};

export default request;

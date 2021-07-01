/**
 * A deno-node fs shim. This provides a deno based implementation
 * shim of node.js' fs module. It only implements a subset of the
 * node.FS api, to satisfy the abstraction used within isomorphic-git.
 *
 * The fundamental reason for this is isomorphic-git relies on error-codes
 * from the FS to make decisions. This module converts Deno errors
 * to Node-FS compatible errors.
 *
 * In addition, it (re)implements [atimeMs, mtimeMs, ctimeMs, birthtimeMs]
 * This is also done in Deno std/node/fs module.
 */

// ----------------------------------------------------------
// Debug Ability
// ----------------------------------------------------------
//
// A simple debug-ability aide, to help trace which API calls
// are failing. At some point in the future, we might be able
// to remove this. However, it's really low cost and use of
// isomorphic-git is not seen to be performance critical to
// such a level of optimization currently. Famous last words?
const trace = false;
const debug = (msg: string) => {
  if (trace) {
    console.log(msg);
  }
};

// ----------------------------------------------------------
// Node Error
// ----------------------------------------------------------
//
// Adds necessary fields to satisfy isomorphic-git.
//
interface NodeError extends Error {
  code?: string | number;
  errno?: number;
  syscall?: string;
}

// ----------------------------------------------------------
// Callback Resolution for Node compatible APIs
// ----------------------------------------------------------
//
// Node APIs treat arguments as being variadic with the last
// one being the callback. In the case of FS, this requires
// resolving the last two arguments between:
//   1. [options, callback]
//   2. [callback]
// The resolve function does this in a type-safe manner

export type CallbackFn = (
  err?: NodeError | Error | null,
  result?: unknown,
) => void;

function resolve<T>(
  defaults: T,
  options: T | CallbackFn,
  cb?: CallbackFn,
): { options?: T; cb: CallbackFn } {
  const _options: T = typeof options === "function"
    ? defaults
    : { ...defaults, ...(options as T) };
  cb = typeof cb === "function" ? cb : (options as CallbackFn);
  if (!cb) {
    throw new Error(`Callback function not defined`);
  }
  return { options: _options, cb };
}

export interface ReadOptions {
  encoding?: string;
  flag?: string;
  signal?: AbortSignal;
}
/**
 * Implementation of Node.js' FS.promises.readFile
 */
const readFile = async (path: string, options?: ReadOptions) => {
  debug(`readFile ${path} ${options?.encoding}`);
  try {
    return options?.encoding === "utf8"
      ? await Deno.readTextFile(path)
      : await Deno.readFile(path);
  } catch (err) {
    if (err.message.match(/(cannot find the (file|path) specified)|(No such file or directory)/)) {
      const error = new Error(
        `ENOENT: no such file or directory, open '${path}'`,
      ) as NodeError;
      error.code = "ENOENT";
      error.syscall = "open";
      throw error;
    } else {
      debug(`readFile error: ${err.message}`);
      throw err;
    }
  }
};

export interface WriteOptions {
  encoding?: string;
  mode?: number;
  flag?: "a" | "ax" | "a+" | "ax+" | "as" | "as+" | "w" | "wx" | "w+" | "wx+";
  signal?: AbortSignal;
}
/**
 * Implementation of Node.js' FS.promises.writeFile
 */
const writeFile = async (
  path: string,
  data: string | ArrayBuffer,
  options: WriteOptions = {
    encoding: "utf8",
    mode: 0o666,
    flag: "w",
  },
) => {
  debug(`writeFile: ${path}`);
  try {
    if (typeof data === "string") {
      options.encoding === "utf8"
        ? await Deno.writeTextFile(path, data as string)
        : await Deno.writeFile(
          path,
          new Uint8Array(new TextEncoder().encode(data as string)),
        );
    } else {
      options.encoding === "utf8"
        ? await Deno.writeTextFile(
          path,
          new TextDecoder().decode(data as ArrayBuffer),
        )
        : await Deno.writeFile(path, new Uint8Array(data as ArrayBuffer));
    }
  } catch (err) {
    if (
      err.message.match(/Cannot create a file when that file already exists/)
    ) {
      const error = new Error(
        `EEXIST: file already exists, write '${path}'`,
      ) as NodeError;
      error.code = "EEXIST";
      error.syscall = "write";
      throw error;
    } else {
      debug(`writeFile ${err.message}`);
      throw err;
    }
  }
};

/**
 * Implementation of Node.js' FS.promises.unlink
 */
const unlink = async (path: string) => {
  // unlink is deleting a file.
  debug(`unlink ${path}`);
  try {
    await Deno.remove(path, { recursive: false });
  } catch (err) {
    if (err.message.match(/(cannot find the (file|path) specified)|(No such file or directory)/)) {
      const error = new Error(
        `ENOENT: no such file or directory, open '${path}'`,
      ) as NodeError;
      error.code = "ENOENT";
      error.syscall = "open";
      throw error;
    } else {
      debug(`unlink error: ${err.message}`);
      throw err;
    }
  }
};

export interface ReaddirOptions {
  encoding: string;
  withFileTypes: boolean;
}
/**
 * Implementation of Node.js' FS.promises.readdir
 */
const readdir = async (
  path: string,
  options: ReaddirOptions = {
    encoding: "utf8",
    withFileTypes: false,
  },
) => {
  debug(`readdir ${path}`);
  try {
    if (options.withFileTypes) {
      return await Deno.readDir(path);
    } else {
      const result: string[] = [];
      for await (const dirEntry of await Deno.readDir(path)) {
        result.push(dirEntry.name);
      }
      return result;
    }
  } catch (err) {
    if (err.message.match(/(cannot find the (file|path) specified)|(No such file or directory)/)) {
      const error = new Error(
        `ENOENT: no such file or directory, open '${path}'`,
      ) as NodeError;
      error.code = "ENOENT";
      error.syscall = "open";
      throw error;
    } else {
      debug(`readdir error: ${err.message}`);
      throw err;
    }
  }
};

export interface MkdirOptions {
  recursive?: boolean;
  mode?: number | string;
}
/**
 * Implementation of Node.js' FS.promises.mkdir
 */
const mkdir = async (
  path: string,
  options: MkdirOptions = {
    recursive: false,
    mode: 0o777,
  },
) => {
  debug(`mkdir ${path}`);
  try {
    const { recursive, mode } = {
      recursive: false,
      mode: 0o777,
      ...options,
    };
    await Deno.mkdir(path, {
      recursive,
      mode: typeof mode === "string" ? parseInt(mode) : mode,
    });
  } catch (err) {
    if (
      err.message.match(/(Cannot create a file when that file already exists)|(File exists)/)
    ) {
      const error = new Error(
        `EEXIST: file already exists, mkdir '${path}'`,
      ) as NodeError;
      error.code = "EEXIST";
      error.syscall = "mkdir";
      throw error;
    } else if (err.message.match(/(cannot find the (file|path) specified)|(No such file or directory)/)) {
      const error = new Error(
        `ENOENT: no such file or directory, open '${path}'`,
      ) as NodeError;
      error.code = "ENOENT";
      error.syscall = "open";
      throw error;
    } else {
      debug(`mkdir error: ${err.message}`);
      throw err;
    }
  }
};

export interface RmdirOptions {
  maxRetries?: number;
  recursive?: boolean;
  retryDelay?: number;
}
/**
 * Implementation of Node.js' FS.promises.rmdir
 */
const rmdir = async (
  path: string,
  options: RmdirOptions = { recursive: false },
) => {
  debug(`rmdir ${path}`);
  try {
    await Deno.remove(path, { recursive: options.recursive });
  } catch (err) {
    if (err.message.match(/(cannot find the (file|path) specified)|(No such file or directory)/)) {
      const error = new Error(
        `ENOENT: no such file or directory, open '${path}'`,
      ) as NodeError;
      error.code = "ENOENT";
      error.syscall = "open";
      throw error;
    } else {
      debug(`rmdir error: ${err.message}`);
      throw err;
    }
  }
};

export interface StatOptions {
  bigint: boolean;
}
/**
 * Implementation of Node.js' FS.promises.stat
 */
const stat = async (
  path: string,
  _options: StatOptions = { bigint: false },
) => {
  try {
    debug(`stat ${path}`);
    return await Deno.stat(path);
  } catch (err) {
    // isomorphic git also processes `ENOTDIR`, but deno
    // doesn't seem to raise it.
    if (err.message.match(/(cannot find the (file|path) specified)|(No such file or directory)/)) {
      const error = new Error(
        `ENOENT: no such file or directory, stat '${path}'`,
      ) as NodeError;
      error.code = "ENOENT";
      error.syscall = "stat";
      throw error;
    } else {
      debug(`stat error: ${err.message}`);
      throw err;
    }
  }
};

interface NodeFileInfo extends Deno.FileInfo {
  atimeMs: number;
  mtimeMs: number;
  ctimeMs: number;
  ctime: string | number;
  birthtimeMs: number;
}
/**
 * Implementation of Node.js' FS.promises.lstat
 */
const lstat = async (path: string) => {
  debug(`lstat ${path}`);
  try {
    const result = (await Deno.lstat(path)) as NodeFileInfo;
    // Deno.fs.lstat is missing the Ms conversions. So we add them here.
    if (result.atime) {
      result.atimeMs = new Date(result.atime).getTime();
    }
    if (result.mtime) {
      result.mtimeMs = new Date(result.mtime).getTime();
    }
    if (result.birthtime) {
      result.birthtimeMs = new Date(result.birthtime).getTime();
    }
    result.ctime = result.ctime ?? result.birthtime;
    result.ctimeMs = new Date(result.ctime).getTime();
    return result;
  } catch (err) {
    if (err.message.match(/(cannot find the (file|path) specified)|(No such file or directory)/)) {
      const error = new Error(
        `ENOENT: no such file or directory, open '${path}'`,
      ) as NodeError;
      error.code = "ENOENT";
      error.syscall = "open";
      throw error;
    } else {
      debug(`lstat error: ${err.message}`);
      throw err;
    }
  }
};

export interface ReadlinkOptions {
  encoding: string;
}
/**
 * Implementation of Node.js' FS.promises.readlink
 */
const readlink = async (
  path: string,
  _options: ReadlinkOptions = { encoding: "utf8" },
) => {
  debug(`readlink ${path}`);

  try {
    // this can be a deno only problem if we have links to binary files.
    return await Deno.readLink(path);
  } catch (err) {
    if (err.message.match(/(cannot find the (file|path) specified)|(No such file or directory)/)) {
      const error = new Error(
        `ENOENT: no such file or directory, open '${path}'`,
      ) as NodeError;
      error.code = "ENOENT";
      error.syscall = "open";
      throw error;
    } else {
      debug(`readlink error: ${err.message}`);
      throw err;
    }
  }
};

/**
 * Implementation of Node.js' FS.promises.symlink
 */
const symlink = async (
  target: string,
  path: string,
  type: "file" | "dir" = "file",
) => {
  debug(`symlink ${target} -> ${path}`);

  const oldPath = path;
  const newPath = target;
  if (type) {
    await Deno.symlink(oldPath, newPath, { type });
  } else {
    await Deno.symlink(oldPath, newPath);
  }
};

const chmod = async (path: string, mode: number) => {
  debug(`chmod ${path}`);
  await Deno.chmod(path, mode);
};

export const fs = {
  // the promises version of the API
  promises: {
    readFile,
    writeFile,
    unlink,
    readdir,
    mkdir,
    rmdir,
    stat,
    lstat,
    readlink,
    symlink,
    chmod,
  },

  // the callback version of the API.
  readFile: (
    path: string,
    options: ReadOptions | CallbackFn,
    cb?: CallbackFn,
  ) => {
    const resolved = resolve({ encoding: "utf8" }, options, cb);
    readFile(path, resolved.options)
      .then((result) => resolved.cb(null, result))
      .catch((err) => resolved.cb(err));
  },

  writeFile: (
    path: string,
    data: string | ArrayBuffer,
    options: WriteOptions | CallbackFn,
    cb?: CallbackFn,
  ) => {
    const resolved = resolve(
      {
        encoding: "utf8",
        mode: 0o666,
        flag: "w",
      },
      options,
      cb,
    );
    writeFile(path, data, resolved.options)
      .then((result) => resolved.cb(null, result))
      .catch((err) => resolved.cb(err));
  },

  unlink: (path: string, cb?: CallbackFn) => {
    const resolved = resolve(null, null, cb);
    unlink(path)
      .then((result) => resolved.cb(null, result))
      .catch((err) => resolved.cb(err));
  },

  readdir: (
    path: string,
    options: ReaddirOptions | CallbackFn,
    cb?: CallbackFn,
  ) => {
    const resolved = resolve(
      {
        encoding: "utf8",
        withFileTypes: false,
      },
      options,
      cb,
    );
    readdir(path, resolved.options)
      .then((result) => resolved.cb(null, result))
      .catch((err) => resolved.cb(err));
  },

  mkdir: (
    path: string,
    options: MkdirOptions | CallbackFn,
    cb?: CallbackFn,
  ) => {
    const resolved = resolve({ recursive: false, mode: 0o777 }, options, cb);
    mkdir(path, resolved.options)
      .then((result) => resolved.cb(null, result))
      .catch((err) => resolved.cb(err));
  },

  rmdir: (
    path: string,
    options: RmdirOptions | CallbackFn,
    cb?: CallbackFn,
  ) => {
    const resolved = resolve({ recursive: false }, options, cb);
    rmdir(path, resolved.options)
      .then((result) => resolved.cb(null, result))
      .catch((err) => resolved.cb(err));
  },

  stat: (path: string, options: StatOptions | CallbackFn, cb?: CallbackFn) => {
    const resolved = resolve({ bigint: false }, options, cb);
    stat(path, resolved.options)
      .then((result) => resolved.cb(null, result))
      .catch((err) => resolved.cb(err));
  },

  lstat: (path: string, cb?: CallbackFn) => {
    const resolved = resolve(null, null, cb);
    lstat(path)
      .then((result) => resolved.cb(null, result))
      .catch((err) => resolved.cb(err));
  },

  readlink: (
    path: string,
    options: ReadlinkOptions | CallbackFn,
    cb?: CallbackFn,
  ) => {
    const resolved = resolve({ encoding: "utf8" }, options, cb);
    readlink(path, resolved.options)
      .then((result) => resolved.cb(null, result))
      .catch((err) => resolved.cb(err));
  },

  symlink: (
    target: string,
    path: string,
    type?: "file" | "dir" | CallbackFn,
    cb?: CallbackFn,
  ) => {
    const resolved = resolve({ type: "file" }, { type }, cb);
    symlink(target, path, resolved.options?.type as "file" | "dir")
      .then((result) => resolved.cb(null, result))
      .catch((err) => resolved.cb(err));
  },

  chmod: (path: string, mode: number, cb: CallbackFn) => {
    chmod(path, mode)
      .then((result) => cb(null, result))
      .catch((err) => cb(err));
  },
};

export default fs;

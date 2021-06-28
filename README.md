# iso-git

Wraps `isomorphic-git` to work with deno.

## Usage

Please see [`isomorphic-git`](https://isomorphic-git.org/) for a more detailed guide
on how to use `isomorphic-git`. This section limits it self to showing how to get
it setup to work within deno.

```
trex install -m iso-git
```

```
import { git,http, fs } from 'iso-git'

await fs.promises.mkdir('.tmp/lightening-fs', { recursive: true });
await git.clone({
    fs,
    http,
    dir,
    url: "https://github.com/isomorphic-git/lightning-fs",
  });
```

## Shims

The module provides two deno-specific shims for node.js abstractions which are
used by isomorphic-git -
    1. fs
    2. http

### fs shim

The [fs module shim](./dn-fs.ts) essentially converts deno error
messages to node-compatible error messages.

In addition, it appends these fields to the `lstat` command output

- `atimeMs`
- `mtimeMs`
- `ctimeMs`
- `birthtimeMs`

### http shim

Wraps deno's fetch module into an `isomorphic-git` compatible `request` method.
`utils` includes the bare minimum of capability required to mimic this functionality.
These files are copied from `isomorphic-git/utils`, since they are not accessible
across the esm.sh auto-exported module.


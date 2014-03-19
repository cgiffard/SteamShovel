SteamShovel
===========

JS code coverage done right.

### Fast

```sh
npm run-script coverage
```

### In detail

```sh
// Instrument code
./lib/cli.js inDir outDir

// Use the reporter with mocha
mocha -R $(pwd)/reporter.js
```

### Should I use it

No.

### Why

It doesn't work properly yet.
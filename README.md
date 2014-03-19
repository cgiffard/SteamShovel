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

It doesn't work properly yet. But:

**Existing instrumentors don't record all the data they could.** There's so much
there — timing, order, complexity, stack depth, environment data like memory or
load — and yet, all they catch is whether the code ran or not.

This binary isn't even useful for determining the coverage you've really got — a
function being considered 'tested' only really counts if you're testing your
code very directly, and you've got checks against its explicit behaviour — not,
if a function is being called ten deep. SteamShovel attempts to take that into
account.

But I also want to:
* Generate heatmaps to pinpoint hot code
* Similarly, for slow code
* Create an HTML UI for allowing you to step through the execution of your code,
  expression by expression (a-la Bret Victor)
* More, when I think of it.
SteamShovel
===========

JS code coverage done right. [Why?](#why-should-you-use-steamshovel)

[![See an example report](https://files.app.net/2h8pnciKv.png)](http://rawgithub.com/cgiffard/SteamShovel/master/report.html)

### Get Started

```sh

# install
npm install -g steamshovel

# instrument
shovel mySourceDirectory myInstrumentedDirectory

# introspect
mocha -R steamshovel

```

For a more detailed guide to the SteamShovel internals, see
the [API section.](#api)

### Why Should You Use SteamShovel

"But I like Blanket/Istanbul/JScover!" I hear you say. "Why should I move?"

That's a great question. It comes down to this:

**Your existing instrumentor is lying to you.**

That's right. When you run your tests, and the coverage data is collected, the
instrumentor only pays attention to whether a code branch was run... or wasn't.
Unfortunately this is a gross oversimplification of how code is invoked by a
test suite, and it will leave you with a false sense of security.

The hypothesis behind SteamShovel is this:

**Your unit tests should run your code directly. Indirect invocation is probably
unintentional, and that code shouldn't be considered tested.**

In order to support this hypothesis, SteamShovel records the stack depth of the
instrumentor at every invocation, and calculates the 'testedness' of a given
branch by applying a weighted inverse logarithm to this depth.

This gives you a **much more accurate** code coverage value. The variance in
'coverage' as defined by SteamShovel and a conventional instrumentor like
Istanbul can be as much as 50% — that's how much Istanbul is over-reporting.

### What else?

SteamShovel can do a whole lot more, too:

* Profile timing, order, and stack depth
* Record environment data like memory or load on a per-expression level (set the
  environment variable `REPORTER_OUTPUT` to `csv` and you'll get an expression
  level dump of timing and memory data!
* Save the result of every evaluation of every expression in your codebase, and
  let you step through the results of your test run, interactively. **(Coming
  soon!)**
* SteamShovel can now auto-instrument your code as you require it! Simply set
  the `AUTO_INSTRUMENT` environment variable to `true` before running the
  SteamShovel reporter. Remember that this won't instrument code that isn't
  required, so the manual instrumentor may be more accurate in some cases.

You can override the SteamShovel instrumentor with your own, and record anything
you might want to record! The sky is the limit.

![SteamShovel's exported memory data from a test run](https://files.app.net/2p54lXIXq.png)

**Seen here: SteamShovel's recorded memory data from a test run, visualised in,
uh... Numbers.app**

See also: [Stack depth of calls over time](https://files.app.net/2p5qdpjOu.png),
[Call latency over run-time of test suite](https://files.app.net/2p5qbErUo.png)
— you're only limited by your imagination here.

### Caveat

Because SteamShovel records so much more from your code, it does have a
considerable performance impact. However, the accuracy of your test coverage
data should be more important than how quickly it runs.

Also, (if you couldn't tell already!) SteamShovel is early in its development.
Be careful: there will be an excruciating number of bugs.

### Todo

* Stats generation needs to be a lot more abstract, and a lot faster. Look
  forward to a huge amount of progress in this area!
* Stats should also allow arbitrary queries to be developed against the data
  which could be defined by a model and included in the template.
* Gotta make things even easier to use!
* More info in the default HTML output.
* Memory usage and timing output as CSV & JSON!

## API

### Processing Files

You can recursively instrument one or more directories or files by using the
SteamShovel instrument processor. This is the same system the CLI tool uses to
instrument your code.

```js
var steamshovel = require("steamshovel");

steamshovel.process("./lib", "./lib-instrumented")
	.on("complete", function(inFile) {
		console.log("The instrumentation of %s is complete!", inFile);
	});
```

#### steamshovel.process ( <string | array> `inFile`, `outFile` <string | array> , EventEmitter emitter )

This function takes a string describing an input file or directory, or an array
of strings of files/directories. If the first parameter is an array, the second
must also be an array, and their lengths must be the same.

The function returns an event emitter, to which it emits the following events:

* `complete` (`file`) — the processing for one of the directly specified files
  or directories is complete.
* `dircomplete` (`dir`) — the processing for a given directory is complete (this
  is emitted for directories that SteamShovel discovers, too — not just for
  directly specified trees.)
* `error` (`error`, `path/file`) — an error was emitted from a filesystem
  operation.
* `ignore` (`file`) — this file was explicitly ignored (the directive
  `steamShovel:ignore` was found in the file.)
* `instrumenterror` (`err`, `file`) — an error occurred while attempting to
  instrument a given file (most likely a syntax error.)
* `mkdir` (`path`) — emitted when SteamShovel creates a new directory
* `nojs` (`file`) — SteamShovel discovered a file, but it is not a JavaScript
  file and will be ignored. (It will be written into the new tree, but not
  instrumented.)
* `processdir` (`dir`, `out`) — Emitted when SteamShovel begins processing a new
  directory
* `readdir` (`dir`) — Emitted after SteamShovel reads the contents of a
  directory.
* `readfile` (`file`) — Emitted after SteamShovel completes reading a file.
* `writefile` (`file`) — Emitted after SteamShovel completes writing a file.

### Instrumenting Code

You can instrument code on a file by file basis by using the
`steamshovel.instrument` method.

#### `steamshovel.instrument` ( <string> `data`, [ <string> `filename`, <boolean> `incorporateMap` ] )

This function takes a string containing the JavaScript source code and returns
the transformed code with instrumentation added.

Presently, the code is instrumented by replacing all applicable expressions with
`SequenceExpressions` (you'll probably know these as lists of expressions
delimited by way of the *comma operator*.) These make a function call with a
unique ID to the individual expression (incorporating a hash of the filename and
an expression index.)

The filename is required if you want to instrument more than one file. Otherwise
you could end up with ID conflicts. (This won't ever be a problem if you let
SteamShovel instrument for you.)

The third boolean parameter enables you to turn off the '*map*', basically a
non-human-readable object definition for the expression instrumentation in the
code. It is advisable that you leave this alone, as the code won't run without
it, but switching it off can be useful for testing the output of the instrument
function.
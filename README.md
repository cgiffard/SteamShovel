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
* Record environment data like memory or load on a per-expression level
* Save the result of every evaluation of every expression in your codebase, and
  let you step through the results of your test run, interactively. (Coming
  soon!)
* SteamShovel can now auto-instrument your code as you require it! Simply set
  the `AUTO_INSTRUMENT` environment variable to `true` before running the
  SteamShovel reporter. Remember that this won't instrument code that isn't
  required, so 

You can override the SteamShovel instrumentor with your own, and record anything
you might want to record! The sky is the limit.

### Caveat

Because SteamShovel records so much more from your code, it does have a
considerable performance impact. However, the accuracy of your test coverage
data should be more important than how quickly it runs.

Also, (if you couldn't tell already!) SteamShovel is early in its development.
Be careful: there will be bugs.

### Todo

* Stats generation needs to be a lot more abstract, and a lot faster. Look
  forward to a huge amount of progress in this area!
* Stats should also allow arbitrary queries to be developed against the data
  which could be defined by a model and included in the template.
* Gotta make things even easier to use!
* More info in the default HTML output.
* Memory usage and timing output as CSV & JSON!
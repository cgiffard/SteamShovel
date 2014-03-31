all: instrument report memdump file restore

cover: coverage

coverage: instrument report file restore

# Instrument the code
instrument:
	./lib/cli.js lib lib-cov

# Run the tests and generate the report
report: instrument
	./node_modules/.bin/mocha -R $(shell pwd)/lib/reporter.js

# File away the report html
file: report
	mkdir -p ./reports
	cp report.html "./reports/$(shell date).html"
	cp report.csv "./reports/$(shell date).csv"

# Restore the lib folder to its original location
clean: restore
restore:
	rm -rfv lib-cov

# Memory instrumentation
memory: memdump restore
memdump: instrument
	REPORTER_OUTPUT=csv ./node_modules/.bin/mocha -R $(shell pwd)/lib/reporter.js
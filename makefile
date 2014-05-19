# Define local bin
BIN=./node_modules/.bin
MOCHA=${BIN}/mocha
JSHINT=${BIN}/jshint
REPORTER=$(shell pwd)/lib/reporter.js

all: install lint test instrument report memdump file restore

install:
	npm install

# Linting
# Uses the local jshint script to provide a code lint report
lint: jshint
jshint: install
	${JSHINT} ./lib
	@echo "Linting: Everything seems OK!";

test: install
	${MOCHA} -R spec
	@echo "Testing: Everything seems OK!";

cover: coverage

coverage: test instrument report file restore

# Instrument the code
instrument:
	./lib/cli.js lib lib-cov

# Run the tests and generate the report
report: instrument
	${MOCHA} -R ${REPORTER}

# File away the report html
file: report
	mkdir -p ./reports
	cp report.html "./reports/$(shell date).html"
	cp report.csv "./reports/$(shell date).csv"
	@echo "Archived reports.";

# Restore the lib folder to its original location
clean: restore
restore:
	rm -rfv lib-cov

# Memory instrumentation
memory: memdump restore
memdump: instrument
	REPORTER_OUTPUT=csv ${MOCHA} -R ${REPORTER}

# Demonstrate instrumentor
demonstrate: instrument
	cat ./lib-cov/instrumentor.js | more
	make clean

# Output RAW instrument map
raw: instrument
	REPORTER_OUTPUT=json ${MOCHA} -R ${REPORTER}
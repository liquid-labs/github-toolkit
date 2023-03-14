.DELETE_ON_ERROR:
.PHONY: all build test lint lint-fix qa

default: build

CATALYST_SCRIPTS:=npx catalyst-scripts

GITHUB_TOOLKIT_SRC:=src
GITHUB_TOOLKIT_FILES:=$(shell find $(GITHUB_TOOLKIT_SRC) \( -name "*.js" -o -name "*.mjs" \) -not -path "*/test/*" -not -name "*.test.js")
GITHUB_TOOLKIT_ALL_FILES:=$(shell find $(GITHUB_TOOLKIT_SRC) \( -name "*.js" -o -name "*.mjs" \))
GITHUB_TOOLKIT:=dist/github-toolkit.js

BUILD_TARGETS:=$(GITHUB_TOOLKIT)

# build rules
build: $(BUILD_TARGETS)

all: build

$(GITHUB_TOOLKIT): package.json $(GITHUB_TOOLKIT_FILES)
	JS_SRC=$(GITHUB_TOOLKIT_SRC) $(CATALYST_SCRIPTS) build

# last-test.txt: $(TEST_BUILT_FILES) $(TEST_DATA_BUILT_FILES)
#	( set -e; set -o pipefail; \
#		JS_SRC=$(TEST_STAGING) $(CATALYST_SCRIPTS) test 2>&1 | tee last-test.txt; )

# test: last-test.txt

# lint rules
last-lint.txt: $(ALL_SRC_FILES)
	( set -e; set -o pipefail; \
		JS_LINT_TARGET=$(GITHUB_TOOLKIT_SRC) $(CATALYST_SCRIPTS) lint | tee last-lint.txt; )

lint: last-lint.txt

lint-fix:
	JS_LINT_TARGET=$(GITHUB_TOOLKIT_SRC) $(CATALYST_SCRIPTS) lint-fix

qa: lint
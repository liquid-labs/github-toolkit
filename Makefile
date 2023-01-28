.DELETE_ON_ERROR:
.PHONY: all build test lint lint-fix

default: build

CATALYST_SCRIPTS:=npx catalyst-scripts

GITHUB_TOOLKIT_SRC:=src
GITHUB_TOOLKIT_FILES:=$(shell find $(GITHUB_TOOLKIT_SRC) \( -name "*.js" -o -name "*.mjs" \) -not -path "*/test/*" -not -name "*.test.js")
GITHUB_TOOLKIT_ALL_FILES:=$(shell find $(GITHUB_TOOLKIT_SRC) \( -name "*.js" -o -name "*.mjs" \))
# GITHUB_TOOLKIT_TEST_SRC_FILES:=$(shell find $(GITHUB_TOOLKIT_SRC) -name "*.js")
# GITHUB_TOOLKIT_TEST_BUILT_FILES:=$(patsubst $(GITHUB_TOOLKIT_SRC)/%, test-staging/%, $(GITHUB_TOOLKIT_TEST_SRC_FILES))
# GITHUB_TOOLKIT_TEST_SRC_DATA:=$(shell find $(GITHUB_TOOLKIT_SRC) -path "*/test/data/*" -type f)
# GITHUB_TOOLKIT_TEST_BUILT_DATA:=$(patsubst $(GITHUB_TOOLKIT_SRC)/%, test-staging/%, $(GITHUB_TOOLKIT_TEST_SRC_DATA))
GITHUB_TOOLKIT:=dist/github-toolkit.js

BUILD_TARGETS:=$(GITHUB_TOOLKIT)

# build rules
build: $(BUILD_TARGETS)

all: build

$(GITHUB_TOOLKIT): package.json $(GITHUB_TOOLKIT_FILES)
	JS_SRC=$(GITHUB_TOOLKIT_SRC) $(CATALYST_SCRIPTS) build

# test
# $(GITHUB_TOOLKIT_TEST_BUILT_DATA): test-staging/%: $(GITHUB_TOOLKIT_SRC)/%
#	@echo "Copying test data..."
#	@mkdir -p $(dir $@)
#	@cp $< $@

#$(GITHUB_TOOLKIT_TEST_BUILT_FILES) &: $(GITHUB_TOOLKIT_ALL_FILES)
#	JS_SRC=$(GITHUB_TOOLKIT_SRC) $(CATALYST_SCRIPTS) pretest

# test: $(GITHUB_TOOLKIT_TEST_BUILT_FILES) $(GITHUB_TOOLKIT_TEST_BUILT_DATA)
#	JS_SRC=test-staging $(CATALYST_SCRIPTS) test

# lint rules
lint:
	JS_LINT_TARGET=$(GITHUB_TOOLKIT_SRC) $(CATALYST_SCRIPTS) lint

lint-fix:
	JS_LINT_TARGET=$(GITHUB_TOOLKIT_SRC) $(CATALYST_SCRIPTS) lint-fix

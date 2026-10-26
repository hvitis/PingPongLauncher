# No package installation is needed. Node.js 22+ is sufficient for the site.
.DEFAULT_GOAL := help
PORT ?= 4173
HOST ?= 127.0.0.1

.PHONY: help serve build check docs test clean

help: ## Show the available commands
	@printf 'make serve  Regenerate and validate the site, then serve it with live reload\nmake build  Create the current static site in dist/\nmake check  Check the site data, links, assets, and geometry inventory\nmake docs   Regenerate English guides, shopping lists, and document downloads\nmake test   Run optional Playwright browser checks (preview must be running)\nmake clean  Remove generated build and browser-test output\n\nOverride the local address with make serve PORT=4200 HOST=127.0.0.1\n'

serve: build ## Build the current site, then serve the editable source with live reload
	PORT=$(PORT) HOST=$(HOST) node scripts/serve.mjs

build: ## Regenerate, check, and export the static website
	node scripts/build.mjs

check: docs ## Validate the current content and local references
	node scripts/check.mjs
	node --test tests/spring.test.mjs

docs: ## Generate Markdown, BOM/shopping CSV files, and the guide ZIP
	node scripts/generate-docs.mjs

test: ## Run browser checks against a running preview
	node tests/browser.mjs

clean: ## Remove only disposable build/test output
	rm -rf dist test-results playwright-report

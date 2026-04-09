# Flutter Project Health & CI Commands
# Usage: make <target>

.PHONY: help doctor analyze test clean build-apk build-ios deps upgrade

help:
	@echo ""
	@echo "  make doctor      Full health check (analyze + test + build)"
	@echo "  make analyze     Static analysis (flutter analyze)"
	@echo "  make test        Run unit tests with coverage"
	@echo "  make clean       Clean build artifacts"
	@echo "  make build-apk   Build release APK"
	@echo "  make build-ios   Build iOS release"
	@echo "  make deps        Show outdated dependencies"
	@echo "  make upgrade     Upgrade dependencies"
	@echo ""

doctor: analyze test
	@echo ""
	@echo "✓ Doctor complete — all checks passed"
	@echo ""

analyze:
	@echo "→ flutter analyze"
	flutter analyze

test:
	@echo "→ flutter test --coverage"
	flutter test --coverage

clean:
	flutter clean
	rm -rf coverage/

build-apk:
	flutter build apk --release

build-ios:
	flutter build ios --release --no-codesign

deps:
	flutter pub outdated

upgrade:
	flutter pub upgrade

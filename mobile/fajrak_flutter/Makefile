# Flutter Project Health & CI Commands
# Usage: make <target>

.PHONY: help doctor analyze test clean build-apk build-aab build-ios deps upgrade

help:
	@echo ""
	@echo "  make doctor      Full health check (analyze + test)"
	@echo "  make analyze     Static analysis (flutter analyze)"
	@echo "  make test        Run unit tests with coverage"
	@echo "  make clean       Clean build artifacts"
	@echo "  make build-apk   Build release APKs split by ABI (direct distribution)"
	@echo "  make build-aab   Build release App Bundle (Play Store)"
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
	flutter build apk --release --split-per-abi --obfuscate --split-debug-info=build/debug-info

build-aab:
	flutter build appbundle --release --obfuscate --split-debug-info=build/debug-info

build-ios:
	flutter build ios --release --no-codesign --obfuscate --split-debug-info=build/debug-info

deps:
	flutter pub outdated

upgrade:
	flutter pub upgrade

# Fajrak Flutter Development Makefile

.PHONY: help setup setup-linux run run-web run-proxy run-web-with-proxy build-web check-secrets build-apk build-bundle test test-coverage clean deps analyze

# Which env file the recipes read. `.env` wins when both exist; `.env.local`
# is the fallback so a locally wired file is never silently ignored and
# `make setup` cannot shadow it with an empty `.env`.
# Keep this recursive (`=`) and evaluated per recipe, not `:=`.
ENV_FILE = $(if $(wildcard .env),.env,.env.local)

# ── Shared --dart-define flags, read from $(ENV_FILE) at recipe run time ──
# IMPORTANT: keep these as `=` (recursive expansion), NOT `:=`.
# We use `grep -m1` and `tr -d` to handle messy .env files safely.
# Split Supabase / Firebase so `run-web-with-proxy` can swap the Supabase
# origin without dropping the Firebase defines (it used to lose them).
SUPABASE_DEFINES = \
	--dart-define=SUPABASE_URL=$$(grep -m1 '^SUPABASE_URL=' $(ENV_FILE) 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ') \
	--dart-define=SUPABASE_ANON_KEY=$$(grep -m1 '^SUPABASE_ANON_KEY=' $(ENV_FILE) 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ')

FIREBASE_DEFINES = \
	--dart-define=FIREBASE_API_KEY=$$(grep -m1 'FIREBASE_API_KEY' $(ENV_FILE) 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ') \
	--dart-define=FIREBASE_AUTH_DOMAIN=$$(grep -m1 'FIREBASE_AUTH_DOMAIN' $(ENV_FILE) 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ') \
	--dart-define=FIREBASE_PROJECT_ID=$$(grep -m1 'FIREBASE_PROJECT_ID' $(ENV_FILE) 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ') \
	--dart-define=FIREBASE_STORAGE_BUCKET=$$(grep -m1 'FIREBASE_STORAGE_BUCKET' $(ENV_FILE) 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ') \
	--dart-define=FIREBASE_MESSAGING_SENDER_ID=$$(grep -m1 'FIREBASE_MESSAGING_SENDER_ID' $(ENV_FILE) 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ') \
	--dart-define=FIREBASE_APP_ID=$$(grep -m1 'FIREBASE_APP_ID' $(ENV_FILE) 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ') \
	--dart-define=FIREBASE_MEASUREMENT_ID=$$(grep -m1 'FIREBASE_MEASUREMENT_ID' $(ENV_FILE) 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ')

# Origin of the Next.js app that serves /api/* (read by
# lib/services/api_base_url.dart). Production by default; the proxy
# target overrides it so the browser only talks to localhost:33964.
API_BASE_URL ?= https://fajrak.com

DART_DEFINES = $(SUPABASE_DEFINES) $(FIREBASE_DEFINES) \
	--dart-define=API_BASE_URL=$(API_BASE_URL)

# ── Sentry DSN (mobile crash reporting), read from .env at recipe run time ──
# Deliberately kept OUT of DART_DEFINES: web builds use their own Sentry
# project (javascript-nextjs), not the mobile DSN. Keep this `=` recursive.
SENTRY_DEFINE = \
	--dart-define=SENTRY_DSN=$$(grep -m1 '^SENTRY_DSN=' $(ENV_FILE) 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ')

# Default target
help:
	@echo "Fajrak Flutter Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make setup          - Install dependencies and configure environment"
	@echo "  make setup-linux    - Install Linux desktop build prerequisites (apt)"
	@echo ""
	@echo "Development:"
	@echo "  make run            - Run on connected device/emulator (includes Sentry)"
	@echo "  make run-web        - Run Flutter web on localhost:33963"
	@echo "  make run-proxy      - Start the dev CORS proxy on localhost:33964"
	@echo "  make run-web-with-proxy - Run Flutter web against the proxy (2 terminals)"
	@echo ""
	@echo "Building:"
	@echo "  make check-secrets  - Verify release build inputs exist (google-services.json, key.properties, keystore)"
	@echo "  make build-web      - Build production web bundle"
	@echo "  make build-apk      - Build release APK"
	@echo "  make build-bundle   - Build release App Bundle for Play Store"
	@echo ""
	@echo "Testing:"
	@echo "  make test           - Run all tests"
	@echo "  make test-coverage  - Run tests with coverage"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make deps           - Update dependencies"
	@echo "  make analyze        - Run static analysis"

# Setup development environment
setup:
	@echo "🔧 Setting up development environment..."
	flutter pub get
	@if [ ! -f .env ] && [ ! -f .env.local ]; then \
		cp .env.example .env; \
		echo "📝 Created .env from .env.example - please edit with your credentials"; \
	fi
	@echo "✅ Setup complete!"

# Install Linux desktop build prerequisites.
# Needed for `flutter run -d linux` / `flutter build linux`.
# The toolchain list is Flutter's own Linux desktop requirement; libcurl4-openssl-dev
# and zlib1g-dev are required by the sentry_flutter plugin, which vendors sentry-native
# via CMake (sentry-native -> find_package(CURL REQUIRED COMPONENTS AsynchDNS)).
# Without the *development* package the configure step fails with:
#   Could NOT find CURL (missing: CURL_LIBRARY CURL_INCLUDE_DIR AsynchDNS)
# After installing, delete the stale configure cache before rebuilding:
#   rm -rf build/linux
setup-linux:
	@echo "🔧 Installing Linux desktop build prerequisites..."
	sudo apt-get update -y
	sudo apt-get install -y \
		clang cmake ninja-build pkg-config \
		libgtk-3-dev libstdc++-12-dev liblzma-dev \
		libcurl4-openssl-dev zlib1g-dev
	@echo "✅ Linux desktop prerequisites installed"

# Run on device/emulator (NOW INCLUDES DART_DEFINES + SENTRY_DEFINE)
run:
	flutter run $(DART_DEFINES) $(SENTRY_DEFINE)

# Run Flutter web (basic)
run-web:
	flutter run -d chrome --web-port=33963 --web-hostname=0.0.0.0 $(DART_DEFINES)

# Run CORS proxy server (run in separate terminal)
run-proxy:
	@echo "🚀 Starting CORS Proxy on http://localhost:33964"
	@echo "   /api/*  → https://fajrak.com"
	@echo "   other   → https://ujwcvtpwsaidljecqbaa.supabase.co"
	@echo ""
	dart run dev_proxy.dart

# Run Flutter web with proxy config (run in separate terminal after make run-proxy)
run-web-with-proxy:
	@echo "🌐 Starting Flutter web with proxy config..."
	@echo "   Flutter web: http://localhost:33963"
	@echo "   Proxy:       http://localhost:33964"
	@echo ""
	@echo "⚠️  Make sure 'make run-proxy' is running in another terminal!"
	flutter run -d chrome \
		--web-port=33963 \
		--web-hostname=0.0.0.0 \
		--dart-define=SUPABASE_URL=http://localhost:33964 \
		--dart-define=SUPABASE_ANON_KEY=$$(grep -m1 '^SUPABASE_ANON_KEY=' $(ENV_FILE) 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ' || echo "your-anon-key") \
		--dart-define=API_BASE_URL=http://localhost:33964 \
		$(FIREBASE_DEFINES)

# Build production web
build-web:
	flutter build web --release $(DART_DEFINES)

# ── Release build preflight ────────────────────────────────────────────────
# Three gitignored files are required by the release build. Without them the
# build fails several minutes in with "File google-services.json is missing"
# (or a null keystore signing error) — long after the fix is obvious. Check first.
# Only `build-apk` / `build-bundle` depend on this; the dart-define extraction
# above is untouched and `build-web` / `run` are unaffected.
# NOTE: the keystore path below is the repo's configured `storeFile` value
# (android/key.properties: storeFile=upload-keystore.jks, resolved relative to
# android/app). If that property is ever changed, update this list too.
RELEASE_INPUTS = \
	android/app/google-services.json \
	android/key.properties \
	android/app/upload-keystore.jks

check-secrets:
	@missing=0; \
	for f in $(RELEASE_INPUTS); do \
		if [ ! -f "$$f" ]; then \
			echo "❌ Missing release build input: $$f"; \
			missing=1; \
		fi; \
	done; \
	if [ $$missing -ne 0 ]; then \
		echo ""; \
		echo "These files are gitignored and must be restored before building:"; \
		echo "  android/app/google-services.json  <- Firebase Console > Project Settings > Your Android App"; \
		echo "                                       (project fajrak-f7df1, package com.fajrak.app)"; \
		echo "  android/key.properties           <- release signing config (keyAlias + storeFile=upload-keystore.jks)"; \
		echo "  android/app/upload-keystore.jks  <- release upload keystore"; \
		echo ""; \
		echo "See docs/DEPLOYMENT.md > Environment Setup > Mobile, and docs/guides/getting-started.md > Android Setup."; \
		exit 1; \
	fi; \
	echo "✅ Release build inputs present."

# Build release APK
build-apk: check-secrets
	flutter build apk --release $(DART_DEFINES) $(SENTRY_DEFINE)
# Run on connected Android / mobile device (includes DART_DEFINES + SENTRY_DEFINE)
run-device:
	flutter run -d 1381970537000198 $(DART_DEFINES) $(SENTRY_DEFINE)
# Build release App Bundle
build-bundle: check-secrets
	flutter build appbundle --release $(DART_DEFINES) $(SENTRY_DEFINE)

# Run tests
test:
	flutter test

# Run tests with coverage
test-coverage:
	flutter test --coverage
	genhtml coverage/lcov.info -o coverage/html
	@echo "📊 Coverage report: coverage/html/index.html"

# Clean build artifacts
clean:
	flutter clean
	rm -rf build/
	rm -rf coverage/

# Update dependencies
deps:
	flutter pub upgrade
	flutter pub outdated

# Static analysis
analyze:
	flutter analyze
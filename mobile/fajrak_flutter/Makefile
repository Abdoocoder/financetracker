# Fajrak Flutter Development Makefile

.PHONY: help setup setup-linux run run-web run-web-proxy build-web build-apk build-bundle test test-coverage clean deps analyze

# ── Shared --dart-define flags, read from .env at recipe run time ──
# IMPORTANT: keep this as `=` (recursive expansion), NOT `:=`.
# We use `grep -m1` and `tr -d` to handle messy .env files safely.
DART_DEFINES = \
	--dart-define=SUPABASE_URL=$$(grep -m1 '^SUPABASE_URL=' .env 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ') \
	--dart-define=SUPABASE_ANON_KEY=$$(grep -m1 '^SUPABASE_ANON_KEY=' .env 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ') \
	--dart-define=FIREBASE_API_KEY=$$(grep -m1 'FIREBASE_API_KEY' .env 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ') \
	--dart-define=FIREBASE_AUTH_DOMAIN=$$(grep -m1 'FIREBASE_AUTH_DOMAIN' .env 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ') \
	--dart-define=FIREBASE_PROJECT_ID=$$(grep -m1 'FIREBASE_PROJECT_ID' .env 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ') \
	--dart-define=FIREBASE_STORAGE_BUCKET=$$(grep -m1 'FIREBASE_STORAGE_BUCKET' .env 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ') \
	--dart-define=FIREBASE_MESSAGING_SENDER_ID=$$(grep -m1 'FIREBASE_MESSAGING_SENDER_ID' .env 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ') \
	--dart-define=FIREBASE_APP_ID=$$(grep -m1 'FIREBASE_APP_ID' .env 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ') \
	--dart-define=FIREBASE_MEASUREMENT_ID=$$(grep -m1 'FIREBASE_MEASUREMENT_ID' .env 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ')

# ── Sentry DSN (mobile crash reporting), read from .env at recipe run time ──
# Deliberately kept OUT of DART_DEFINES: web builds use their own Sentry
# project (javascript-nextjs), not the mobile DSN. Keep this `=` recursive.
SENTRY_DEFINE = \
	--dart-define=SENTRY_DSN=$$(grep -m1 '^SENTRY_DSN=' .env 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ')

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
	@echo "  make run-web-proxy  - Run Flutter web with CORS proxy (2 terminals needed)"
	@echo ""
	@echo "Building:"
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
	@if [ ! -f .env ]; then \
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
	@echo "   Forwards to: https://ujwcvtpwsaidljecqbaa.supabase.co"
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
		--dart-define=SUPABASE_ANON_KEY=$$(grep -m1 '^SUPABASE_ANON_KEY=' .env 2>/dev/null | cut -d'=' -f2- | tr -d '\r" ' || echo "your-anon-key")

# Build production web
build-web:
	flutter build web --release $(DART_DEFINES)

# Build release APK
build-apk:
	flutter build apk --release $(DART_DEFINES) $(SENTRY_DEFINE)

# Build release App Bundle
build-bundle:
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
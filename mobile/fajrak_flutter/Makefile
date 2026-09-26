# Fajrak Flutter Development Makefile

.PHONY: help setup run run-web run-web-proxy build-web build-apk build-bundle test test-coverage clean deps analyze

# Default target
help:
	@echo "Fajrak Flutter Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make setup          - Install dependencies and configure environment"
	@echo ""
	@echo "Development:"
	@echo "  make run            - Run on connected device/emulator"
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

# Run on device/emulator
run:
	flutter run

# Run Flutter web (basic)
run-web:
	flutter run -d chrome --web-port=33963 --web-hostname=0.0.0.0

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
		--dart-define=SUPABASE_ANON_KEY=$$(grep SUPABASE_ANON_KEY .env 2>/dev/null | cut -d'=' -f2 || echo "your-anon-key")

# Combined proxy + web (requires two terminals - use run-proxy + run-web-with-proxy instead)
run-web-proxy:
	@echo "⚠️  This command requires two terminals. Use instead:"
	@echo "   Terminal 1: make run-proxy"
	@echo "   Terminal 2: make run-web-with-proxy"
	@echo ""
	@echo "Or run Flutter web directly with Supabase CORS configured:"
	@echo "   make run-web"

# Build production web
build-web:
	flutter build web --release \
		--dart-define=SUPABASE_URL=$$(grep SUPABASE_URL .env 2>/dev/null | cut -d'=' -f2) \
		--dart-define=SUPABASE_ANON_KEY=$$(grep SUPABASE_ANON_KEY .env 2>/dev/null | cut -d'=' -f2) \
		--dart-define=FIREBASE_API_KEY=$$(grep FIREBASE_API_KEY .env 2>/dev/null | cut -d'=' -f2) \
		--dart-define=FIREBASE_AUTH_DOMAIN=$$(grep FIREBASE_AUTH_DOMAIN .env 2>/dev/null | cut -d'=' -f2) \
		--dart-define=FIREBASE_PROJECT_ID=$$(grep FIREBASE_PROJECT_ID .env 2>/dev/null | cut -d'=' -f2) \
		--dart-define=FIREBASE_STORAGE_BUCKET=$$(grep FIREBASE_STORAGE_BUCKET .env 2>/dev/null | cut -d'=' -f2) \
		--dart-define=FIREBASE_MESSAGING_SENDER_ID=$$(grep FIREBASE_MESSAGING_SENDER_ID .env 2>/dev/null | cut -d'=' -f2) \
		--dart-define=FIREBASE_APP_ID=$$(grep FIREBASE_APP_ID .env 2>/dev/null | cut -d'=' -f2) \
		--dart-define=FIREBASE_MEASUREMENT_ID=$$(grep FIREBASE_MEASUREMENT_ID .env 2>/dev/null | cut -d'=' -f2)

# Build release APK
build-apk:
	flutter build apk --release

# Build release App Bundle
build-bundle:
	flutter build appbundle --release

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
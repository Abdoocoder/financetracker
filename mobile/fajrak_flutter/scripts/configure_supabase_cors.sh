#!/bin/bash
# Configure Supabase CORS for local development
# Requires: Supabase Personal Access Token with project permissions

set -e

PROJECT_REF="ujwcvtpwsaidljecqbaa"
LOCALHOST_URLS=("http://localhost:33963" "http://127.0.0.1:33963" "http://localhost:33964" "http://127.0.0.1:33964")

echo "🔧 Configuring Supabase CORS for project: $PROJECT_REF"
echo ""

# Check for token
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ SUPABASE_ACCESS_TOKEN environment variable not set"
    echo ""
    echo "Get your token from: https://supabase.com/dashboard/account/tokens"
    echo "Then run: export SUPABASE_ACCESS_TOKEN=your_token"
    exit 1
fi

# Configure Auth Redirect URLs
echo "📝 Updating Auth Redirect URLs..."
REDIRECT_URLS=$(printf '"%s",' "${LOCALHOST_URLS[@]}" | sed 's/,$//')

curl -s -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"redirect_urls\": [$REDIRECT_URLS]}" | jq .

echo ""
echo "📝 Updating Storage CORS..."

# Configure Storage CORS
CORS_CONFIG=$(cat <<EOF
[
  $(for url in "${LOCALHOST_URLS[@]}"; do
    cat <<EOC
    {
      "origin": "$url",
      "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "headers": ["Content-Type", "Authorization", "apikey", "x-client-info"],
      "maxAgeSeconds": 3600
    }
EOC
  done | paste -sd,)
]
EOF
)

curl -s -X PUT "https://api.supabase.com/v1/projects/$PROJECT_REF/storage/cors" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$CORS_CONFIG" | jq .

echo ""
echo "✅ Supabase CORS configuration complete!"
echo ""
echo "🔄 Changes may take 1-2 minutes to propagate."
echo "Then run: flutter run -d chrome --web-port=33963"
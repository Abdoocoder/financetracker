#!/bin/bash
# Creates local.properties for Flutter Android projects
# Run this after cloning the repo on a new machine

# Detect Android SDK path
if [ -n "$ANDROID_HOME" ]; then
    ANDROID_SDK="$ANDROID_HOME"
elif [ -d "$HOME/AppData/Local/Android/Sdk" ]; then
    ANDROID_SDK="$(cygpath -w "$HOME/AppData/Local/Android/Sdk" 2>/dev/null || echo "$HOME/AppData/Local/Android/Sdk")"
elif [ -d "$HOME/Android/Sdk" ]; then
    ANDROID_SDK="$HOME/Android/Sdk"
else
    echo "ERROR: Android SDK not found. Set ANDROID_HOME or install Android Studio."
    exit 1
fi

# Detect Flutter SDK path
if [ -n "$FLUTTER_ROOT" ]; then
    FLUTTER_SDK="$FLUTTER_ROOT"
elif command -v flutter &>/dev/null; then
    FLUTTER_SDK="$(dirname "$(dirname "$(command -v flutter)")")"
elif [ -d "/c/flutter" ] || [ -d "C:/flutter" ]; then
    FLUTTER_SDK="C:\\flutter"
else
    echo "ERROR: Flutter SDK not found. Install Flutter or set FLUTTER_ROOT."
    exit 1
fi

# Target directories
TARGETS=(
    "mobile/tmp_app/android"
    "mobile/fajrak_flutter/android"
)

for DIR in "${TARGETS[@]}"; do
    FILE="$DIR/local.properties"
    if [ -d "$DIR" ]; then
        # Convert paths to Windows format for gradle
        SDK_WIN=$(echo "$ANDROID_SDK" | sed 's|/c/|C:\\\\|; s|/|\\\\|g')
        FLUTTER_WIN=$(echo "$FLUTTER_SDK" | sed 's|/c/|C:\\\\|; s|/|\\\\|g')

        cat > "$FILE" <<EOF
sdk.dir=${ANDROID_SDK//\\/\\\\}
flutter.sdk=${FLUTTER_SDK//\\/\\\\}
EOF
        echo "Created: $FILE"
    fi
done

echo "Done!"

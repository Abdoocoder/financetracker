# Creates local.properties for Flutter Android projects
# Run this after cloning the repo on a new machine:
#   powershell -ExecutionPolicy Bypass -File scripts/setup_local_properties.ps1

# Detect Android SDK path
if ($env:ANDROID_HOME) {
    $androidSdk = $env:ANDROID_HOME
} elseif (Test-Path "$env:LOCALAPPDATA\Android\Sdk") {
    $androidSdk = "$env:LOCALAPPDATA\Android\Sdk"
} else {
    Write-Error "Android SDK not found. Install Android Studio or set ANDROID_HOME."
    exit 1
}

# Detect Flutter SDK path
if ($env:FLUTTER_ROOT) {
    $flutterSdk = $env:FLUTTER_ROOT
} elseif (Get-Command flutter -ErrorAction SilentlyContinue) {
    $flutterSdk = (Get-Item (Get-Command flutter).Source).Directory.Parent.FullName
} elseif (Test-Path "C:\flutter") {
    $flutterSdk = "C:\flutter"
} else {
    Write-Error "Flutter SDK not found. Install Flutter or set FLUTTER_ROOT."
    exit 1
}

$targets = @(
    "mobile\tmp_app\android",
    "mobile\fajrak_flutter\android"
)

foreach ($dir in $targets) {
    if (Test-Path $dir) {
        $content = "sdk.dir=$($androidSdk -replace '\\', '\\')`nflutter.sdk=$($flutterSdk -replace '\\', '\\')`n"
        Set-Content -Path "$dir\local.properties" -Value $content -Encoding UTF8
        Write-Host "Created: $dir\local.properties"
    }
}

Write-Host "Done!"

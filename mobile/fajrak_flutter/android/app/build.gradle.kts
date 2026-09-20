import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    id("com.google.gms.google-services")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    val keystorePropertiesFile = rootProject.file("key.properties")
    val keystoreProperties = Properties()
    if (keystorePropertiesFile.exists()) {
        keystorePropertiesFile.inputStream().use { stream ->
            keystoreProperties.load(stream)
        }
    } else {
        println("Warning: key.properties not found at ${keystorePropertiesFile.absolutePath}")
    }

    ndkVersion = "28.2.13676358"
    namespace = "com.fajrak.app"
    compileSdk = 37

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.fajrak.app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties.getProperty("keyAlias")
            keyPassword = keystoreProperties.getProperty("keyPassword")
            storeFile = keystoreProperties.getProperty("storeFile")?.let { path -> file(path) }
            storePassword = keystoreProperties.getProperty("storePassword")
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            // isShrinkResources is deprecated in AGP 9.0+; resource shrinking is enabled by default when minify is enabled
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // Disable lint for release to avoid Metaspace OOM
            lintOptions {
                isCheckReleaseBuilds = false
                isAbortOnError = false
            }
        }
    }
}

flutter {
    source = "../.."
}

// Workaround for app_links + Gradle 8.14+ issue
// https://github.com/flutter/flutter/issues/149791
// https://github.com/app-links/app-links-flutter/issues/123
// Only target the app_links module's parseReleaseLocalResources task
tasks.matching { it.name.startsWith(":app_links:parseReleaseLocalResources") }.configureEach {
    doNotTrackState("Workaround for app_links librarySymbolsFile issue")
}

tasks.withType<JavaCompile>().configureEach {
    options.compilerArgs.add("-Xlint:-options")
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("com.google.android.material:material:1.12.0")
}

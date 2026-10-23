allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory = rootProject.layout.buildDirectory.dir("../../build").get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}

subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
subprojects {
    if (project.name == "flutter_app_badge_control") {
        extensions.findByType<com.android.build.gradle.LibraryExtension>()?.apply {
            compileSdk = 34
        }
    }
}

// sentry_flutter 8.14.2 hardcodes `languageVersion = "1.6"` in its plugin
// build.gradle (android/build.gradle:58). Kotlin 2.3.20 (settings.gradle.kts:25)
// rejects anything below 2.0: "Language version 1.6 is no longer supported;
// use version 2.0 or greater instead". Scoped to that module only, so the app
// and every other plugin keep the 2.3 default.
//
// 2.0 and not 2.1: 8.14.2 still calls `toUpperCase(Locale)`, which is only a
// warning at language version 2.0 but an *error* at 2.1 (errorSince=2.1), and
// the 1.6-era source can't be edited in place. Expect a harmless
// "Language version 2.0 is deprecated ... Update the version to 2.1" warning.
// 8.14.2 is the last 8.x ever published; 9.0-9.4 still pin 1.6.
//
// Also: package_info_plus 10.2.2 requires compileSdk >= 36; sentry_flutter
// hardcodes 34, so force compileSdk 37 to satisfy AAR metadata checks.
//
// TODO(remove on sentry_flutter upgrade): moving to 10.x also needs minSdk 26,
// android.builtInKotlin=true, and the immutable SentryEvent API (`copyWith` is
// gone) — see lib/services/sentry_service.dart:140,159.
subprojects {
    if (project.name == "sentry_flutter") {
        project.afterEvaluate {
            // AGP 7.x (sentry_flutter uses AGP 7.4.2) uses BaseExtension
            extensions.findByType<com.android.build.gradle.BaseExtension>()?.apply {
                compileSdkVersion(37)
            }
            // Also try LibraryExtension for safety
            extensions.findByType<com.android.build.gradle.LibraryExtension>()?.apply {
                compileSdk = 37
            }
        }
        tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
            compilerOptions {
                languageVersion.set(org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_2_0)
            }
        }
    }
}

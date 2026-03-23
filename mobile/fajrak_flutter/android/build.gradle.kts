allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(name)
    layout.buildDirectory.value(newSubprojectBuildDir)

    if (name != "app") {
        afterEvaluate {
            if (plugins.hasPlugin("com.android.library") || plugins.hasPlugin("com.android.application")) {
                val android = extensions.findByName("android") as? com.android.build.gradle.BaseExtension
                android?.apply {
                    compileSdkVersion(36)
                    if (namespace == null) {
                        namespace = if (name == "flutter_app_badger") {
                            "fr.g123k.flutterappbadge.flutterappbadger"
                        } else {
                            "com.fajrak.app.plugins.${name.replace("-", "_")}"
                        }
                    }
                }
            }
        }
    }
}

// Removed circular evaluation dependency on :app

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}

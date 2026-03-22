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
    val subproject = this
    val newSubprojectBuildDir: Directory = newBuildDir.dir(subproject.name)
    subproject.layout.buildDirectory.value(newSubprojectBuildDir)
}

subprojects {
    val subproject = this
    if (subproject.name != "app") {
        val configureAndroid: (Project) -> Unit = { proj ->
            if (proj.plugins.hasPlugin("com.android.library") || proj.plugins.hasPlugin("com.android.application")) {
                val android = proj.extensions.findByName("android") as? com.android.build.gradle.BaseExtension
                android?.apply {
                    compileSdkVersion(34)
                    if (namespace == null) {
                        namespace = if (proj.name == "flutter_app_badger") {
                            "fr.g123k.flutterappbadge.flutterappbadger"
                        } else {
                            "com.fajrak.app.plugins.${proj.name.replace("-", "_")}"
                        }
                    }
                }
            }
        }

        if (subproject.state.executed) {
            configureAndroid(subproject)
        } else {
            subproject.afterEvaluate(configureAndroid)
        }
    }
}

subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}

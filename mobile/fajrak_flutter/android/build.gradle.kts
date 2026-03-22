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
        subproject.afterEvaluate {
            if (subproject.plugins.hasPlugin("com.android.library") || subproject.plugins.hasPlugin("com.android.application")) {
                val android = subproject.extensions.findByName("android") as? com.android.build.gradle.BaseExtension
                android?.apply {
                    if (namespace == null) {
                        namespace = "com.fajrak.app.plugins.${subproject.name.replace("-", "_")}"
                    }
                }
            }
        }
    }
}

subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}

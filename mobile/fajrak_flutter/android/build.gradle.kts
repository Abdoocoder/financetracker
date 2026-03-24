allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.layout.buildDirectory.set(
    rootProject.projectDir.parentFile.resolve("build")
)

subprojects {
    project.layout.buildDirectory.set(
        rootProject.layout.buildDirectory.get().asFile.resolve(project.name)
    )
}

subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}

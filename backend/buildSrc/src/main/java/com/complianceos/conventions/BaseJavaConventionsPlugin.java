package com.complianceos.conventions;

import com.diffplug.gradle.spotless.SpotlessExtension;
import org.gradle.api.Action;
import org.gradle.api.Project;
import org.gradle.api.plugins.JavaPluginExtension;
import org.gradle.api.tasks.JavaExec;
import org.gradle.api.tasks.compile.JavaCompile;
import org.gradle.api.tasks.javadoc.Javadoc;
import org.gradle.jvm.toolchain.JavaLanguageVersion;

public abstract class BaseJavaConventionsPlugin {

    protected void configureCommonFunctionality(final Project project) {
    project.getPluginManager().apply("com.diffplug.spotless");
    project.getPluginManager().apply("org.kordamp.gradle.jandex");

    project
        .getExtensions()
        .configure(
            JavaPluginExtension.class,
            extension ->
                extension.getToolchain().getLanguageVersion().set(JavaLanguageVersion.of(25)));

    project.getExtensions().configure(SpotlessExtension.class, configureSpotless(project));
    configureCompilerOptions(project);
    configureJavaExecTasks(project);
    configureJandexOrdering(project);
  }

  private static Action<SpotlessExtension> configureSpotless(final Project project) {
    return spotless -> {
      spotless.java(
          java -> {
            java.target(
                "src/main/java/**/*.java",
                "src/test/java/**/*.java",
                "src/integrationTest/java/**/*.java");
            java.googleJavaFormat();
          });

      spotless.format(
          "misc",
          misc -> {
            misc.target("*.md", ".gitignore", "*.yml", "*.yaml");
            misc.trimTrailingWhitespace();
            misc.endWithNewline();
          });
    };
  }

  private static void configureCompilerOptions(final Project project) {
    project
        .getTasks()
        .withType(JavaCompile.class)
        .configureEach(
            task -> {
              task.getOptions().getCompilerArgs().add("--enable-preview");
              task.getOptions().getCompilerArgs().add("-Xlint:unchecked");
            });
  }



  private static void configureJavaExecTasks(final Project project) {
    project.getTasks().withType(JavaExec.class).configureEach(task -> {
      task.jvmArgs("--enable-preview");
      task.dependsOn("jandex");
    });
  }

  private static void configureJandexOrdering(final Project project) {
    project.getTasks().named("jar").configure(task -> task.dependsOn("jandex"));
    project
        .getTasks()
        .withType(Javadoc.class)
        .configureEach(task -> task.dependsOn("jandex"));

    project
        .getPluginManager()
        .withPlugin(
            "io.quarkus",
            applied ->
                project
                    .getTasks()
                    .named("quarkusDependenciesBuild")
                    .configure(task -> task.dependsOn("jandex")));
  }
}

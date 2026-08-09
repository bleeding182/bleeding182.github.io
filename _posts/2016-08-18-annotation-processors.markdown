---
layout: post
title:  "Annotation Processors"
categories: android
tags:
- annotations
- annotation-processor
published: true
excerpt_separator: <!--more-->
---

If you feel like generating your own source code there is little information available on how to start or where to begin. In this post I want to offer some introduction into Java annotation processors, how to generate source code, and&mdash;most importantly&mdash;how to test it.

For the sake of this guide I just want to stub out a simple interface.

{%highlight java%}
interface Teapot {
    void boilWater();
    boolean isBoiling();
}
{%endhighlight%}

Yea...this should not be too hard...and who does not like tea?

<!--more-->

## Where to start?

Annotation processors run at compile time. I guess their main use case is to generate some additional source code or documentation, but if you feel like the creative kind you might just find another way to make good use of them. The idea is simple: Register an annotation processor to be called each time an annotation is encountered.

If you have used some code generating library before, you might recognize this setup, as I will be talking about 2 projects.

* a public core&mdash;the annotations to use, helper methods, and the "library"
* the actual annotation processor

The Annotation processor itself should not be included in the compiled project&mdash;we just need its output. If you don't know what you're doing&mdash;or you're just being lazy&mdash;you can stuff everyting into one project. We want to get running, and you can always refactor later.

### Adding an annotation

As mentioned earlier, this will be a simple demo project. In this sample's *core* project we will just include one single annotation which will mark an entry point to our processor.

{%highlight java%}
@Retention(SOURCE)
@Target(TYPE)
public @interface Stub {
}
{%endhighlight%}

Whenever the processor encounters an annotated interface we want to generate some stubbed class that implements the interface. Don't forget to add the *core* project as a dependency to the *processor*, if you did not put everything into one project.

## Creating the Processor

First things first: I want my code generation to be tested and above all I want some abstraction for writing my source code. If you tried to generate formatted output before, you know why.

You might know that your options are pretty limited for testing your annotation processor. I will make use of [Compile Testing][Compile Testing] by Google which provides a good syntax to unit-test my processor where you just supply some source code and the expected output of your processor&mdash;This should be simple and straightforward enough.

To generate properly formatted source code you have various options. There are a couple of templating engines, you could write your own abstraction, and there are also some other libraries. I picked [JavaPoet][JavaPoet] by Square, because it offers a great and easy syntax, as you will see later.

Just add the dependencies to your project `build.gradle` and I hope I do not have to explain what `junit` does.

{%highlight groovy%}
testCompile 'junit:junit:4.12'

testCompile 'com.google.testing.compile:compile-testing:0.8'
compile 'com.squareup:javapoet:1.7.0'
{%endhighlight%}
Because I do not want to create that `META-INF/services` file myself, I make use of yet another Google library which will handle this for me: [AutoService][AutoService]

*You have to register your annotation processors as a service or it will not be run. To do so you add this META file to your project&mdash;or just let this library do it for you.*
{%highlight groovy%}
compile 'com.google.auto.service:auto-service:1.0-rc2'
{%endhighlight%}

And we are set. We can now start with the fun stuff and create a `StubProcessor` in our *processor* project. You will probably notice `@AutoService`, which will just register this class as an annotation processor.

*Alternatively you can create `javax.annotation.processing.Processor` in your `resources/META-INF/services/` directory and add the qualified name of your processor to it&mdash;guys...just use `AutoService`*.

{%highlight java%}
@AutoService(Processor.class)
public class StubProcessor extends AbstractProcessor {
    @Override
    public boolean process(Set<? extends TypeElement> annotations,
                           RoundEnvironment roundEnv) {
        return false;
    }

    @Override
    public Set<String> getSupportedAnnotationTypes() {
        return Collections.singleton(Stub.class.getCanonicalName());
    }
}
{%endhighlight%}

This is just an empty implementation, that does nothing yet. I start by adding a simple test and will go from there, but if you don't feel like writing unit tests for your annotation processor you don't have to. Watch out, though, or you will end up wasting lots of your time. *Compile Testing* really makes things quite easy, so just read on.

### A first test

To get things going I just want to generate a source file that contains my class-to-be. The following test case should be easily readable due to the use of the *Compile Testing*  library. It declares some source code as input and validates the output. And yes, this is all you need.

{%highlight java%}
@RunWith(JUnit4.class)
public class ProcessorTest {
    private StubProcessor mProcessor;

    @Before
    public void init() {
        mProcessor = new StubProcessor();
    }

    @Test
    public void generateEmptyStubbedClass() {
        assert_().about(javaSource())
                .that(JavaFileObjects.forSourceLines("demo.Teapot",
                        "package demo;",
                        "@demo.Stub public interface Teapot {}"))
                .processedWith(mProcessor)
                .compilesWithoutError()
                .and()
                .generatesSources(JavaFileObjects
                        .forSourceLines("demo",
                                "package demo;",
                                "public class StubTeapot implements Teapot {",
                                "}"
                        ));
    }
}
{%endhighlight%}

It declares a `Teapot` interface which is annotated by our `@Stub` annotation. The code should compile, so be sure to use either imports or fully qualified names, as I did with `@demo.Stub`.

After running the annotation processor, we expect that a class `StubTeapot` that also implements our interface was generated. The test fails, and we just set our first goal.

### Getting the first test green

We now have a failing unit test and to fix it we need to generate a class that implements the annotated interface. Any previous experience with Java type elements and reflection will come in handy, as you will be doing *a lot* with it, but for now we start by checking if we do actually have an interface, and if so, we generate a stub.

We modify our `StubProcessor` from before to check the annotated type and process every annotated interface.

{%highlight java%}
@Override
public boolean process(Set<? extends TypeElement> annotations,
                       RoundEnvironment roundEnv) {
    for (Element element : roundEnv.getElementsAnnotatedWith(Stub.class)) {
        if (element.getKind() == ElementKind.INTERFACE) {
            stubOutInterface((TypeElement) element);
        }
    }
    return false;
}
{%endhighlight%}

Next, for every annotated interface we generate a simple class. The name gets prefixed by `Stub` and it should use the same package as our interface. The "class building magic" you will see is *JavaPoet*, which offers a really easy way to build your types.

We will start by declaring our stubbed type, set it public, and make sure it implements our interface. Then we just tell *JavaPoet* to write the source file and we are done. `processingEnv` is some field of `AbstractProcessor` which grants you access to various utilities&mdash;other than that everything should be pretty clear.

{%highlight java%}
private void stubOutInterface(TypeElement superInterface) {
    String stubName = "Stub" + superInterface.getSimpleName();
    TypeSpec stubClass = TypeSpec.classBuilder(stubName)
            .addSuperinterface(ClassName.get(superInterface))
            .addModifiers(Modifier.PUBLIC)
            .build();

    String packageName = superInterface.getEnclosingElement()
            .getSimpleName().toString();
    JavaFile javaFile = JavaFile.builder(packageName, stubClass)
            .build();

    try {
        // write our type to disk
        javaFile.writeTo(processingEnv.getFiler());
    } catch (IOException e) {
        e.printStackTrace();
    }
}
{%endhighlight%}

If we try running that test again it passes and we just successfully generated ourselves our first class.

## Advancing from here

As a simple next step, I want to show an error, if someone decided to annotate a class with our annotation. The test case is just as simple; you can see for yourself:

{%highlight java%}
@Test
public void errorForAnnotatedClass() {
    assert_().about(javaSource())
            .that(JavaFileObjects.forSourceLines("demo.Teapot",
                    "package demo;",
                    "@demo.Stub public class Teapot {}"))
            .processedWith(mProcessor)
            .failsToCompile()
            .withErrorContaining("Please just annotate interfaces.");
}
{%endhighlight%}

The test will fail, and we know to add some error message to our annotation processor. If you remember the loop from before, where we checked whether we had an interface, this is where we will also emit our error. The `processingEnv` from before also contains a `Messager` which helps us to emit notes, warnings, and&mdash;in this case&mdash;an error.

{%highlight java%}
@Override
public boolean process(Set<? extends TypeElement> annotations,
                       RoundEnvironment roundEnv) {
    for (Element element : roundEnv.getElementsAnnotatedWith(Stub.class)) {
        if (element.getKind() == ElementKind.INTERFACE) {
            stubOutInterface((TypeElement) element);
        } else {
            processingEnv.getMessager()
                    .printMessage(Diagnostic.Kind.ERROR,
                            "Please just annotate interfaces.", element);
        }
    }
    return false;
}
{%endhighlight%}
Always make sure to pass in the affected `Element` as the last parameter to your message, because it will display line and position to your user, and IDEs will let you jump to that piece of code.

### Stubbing out the methods

Since I started this post with the promise of stubbing out some interface, this is what this last part of the guide will be about. Again, we just start with our test.

{%highlight java%}
@Test
public void generateStubbedClass() {
    assert_().about(javaSource())
            .that(JavaFileObjects.forSourceLines("demo.Teapot",
                    "package demo;",
                    "@demo.Stub public interface Teapot {",
                    "void boilWater();",
                    "boolean isBoiling();",
                    "}"))
            .processedWith(mProcessor)
            .compilesWithoutError()
            .and()
            .generatesSources(JavaFileObjects
                    .forSourceLines("demo",
                            "package demo;",
                            "public class StubTeapot implements Teapot {",
                            "@Override public void boilWater() {}",
                            "@Override public boolean isBoiling() { return false; }",
                            "}"
                    ));
}
{%endhighlight%}

We will just continue with our code from before by iterating over every method in the interface and creating a `MethodSpec` for each method. Since it has to be valid source code, every non-void method has to return some value, so we will just look up some default value for each type. I will end the guide here with my implementation that gets the test passing, but as you see, I still have to handle cases other than `boolean` or `void`.

{%highlight java%}
private void stubOutInterface(TypeElement superInterface) {
    String stubName = "Stub" + superInterface.getSimpleName();
    TypeSpec stubClass = TypeSpec.classBuilder(stubName)
            .addSuperinterface(ClassName.get(superInterface))
            .addModifiers(Modifier.PUBLIC)
            .addMethods(createStubbedMethods(superInterface))
            .build();

    String packageName = superInterface.getEnclosingElement()
            .getSimpleName().toString();
    JavaFile javaFile = JavaFile.builder(packageName, stubClass)
            .skipJavaLangImports(true)
            .build();

    try {
        // write our type to disk
        javaFile.writeTo(processingEnv.getFiler());
    } catch (IOException e) {
        e.printStackTrace();
    }
}

private Iterable<MethodSpec> createStubbedMethods(TypeElement superInterface) {
    List<MethodSpec> methods = new ArrayList<>();
    for (Element element : superInterface.getEnclosedElements()) {
        if (element.getKind() == ElementKind.METHOD) {
            methods.add(createStubbedMethod((ExecutableElement) element));
        }
    }
    return methods;
}

private MethodSpec createStubbedMethod(ExecutableElement method) {
    return MethodSpec.methodBuilder(method.getSimpleName().toString())
            .addAnnotation(Override.class)
            .addModifiers(Modifier.PUBLIC)
            .returns(ClassName.get(method.getReturnType()))
            .addCode(getDefaultReturnValue(method.getReturnType()))
            .build();
}

private CodeBlock getDefaultReturnValue(TypeMirror type) {
    if (type.getKind() == TypeKind.VOID) {
        return CodeBlock.builder().addStatement("// do nothing").build();
    } else if (type.getKind() == TypeKind.BOOLEAN) {
        return CodeBlock.builder().addStatement("return $L", false).build();
    } /* TODO other types  */
    return CodeBlock.builder().addStatement("return null").build();
}
{%endhighlight%}

Thanks for reading! :)


[Compile Testing]:https://github.com/google/compile-testing
[JavaPoet]: https://github.com/square/javapoet
[AutoService]: https://github.com/google/auto/tree/master/service

---
layout: post
title:  "Dagger 2 Basics"
categories: android
tags:
- dagger-2
---
Dagger 2 can be confusing. This shall shed some light on the key concepts and highlight their proper use. You could start by reading the [User's Guide](http://google.github.io/dagger/users-guide.html) to acquire the general and official knowledge, and once you have brewed your coffee, pray, continue.

## Components
Dagger 2 is all about components. You cannot use Dagger without any of those, since they contain all the information. I tend to call components the object graph&mdash;objects depending on objects depending on other objects and so on. Every dependency is a requirement that has to be satisfied before the dependent object can be created. Thinking of it as a graph thus makes for a much more understandable picture. 

Components know everything about object creation and every object that you want to use will be delivered to you by a component in some way. I want to start talking about single components and their usage.

### Scopes

I have not yet found a good reason to use unscoped components, so I want to say that in general every component of yours will have some scope. You may have already seen or noticed `@Singleton` which ships with Dagger, but no matter what their name is, they all behave the same and there is *no* exception. To use `@Singleton` as your root&mdash;remember, it's a graph!&mdash;is convention, but you could as well create and use a `@FooScope` and achieve the same.

{%highlight java%}
@Scope
@Documented
@Retention(RUNTIME)
public @interface Singleton {}
{%endhighlight%}

Scopes ensure a few things when using components:

* A scoped object is created *within its scope* only once
* A scoped object can *only* be provided by a component of *the same scope*
* Scopes can not have cyclic dependencies (A depends on B depends on A)

The last point is especially obvious if you have proper naming, e.g. having an `@Singleton` scoped object depend on some `@FrequentlyChangingScope` will not only mean that you screwed up, Dagger will even refuse to compile.

For Android this means for starters a setup like the following:

* Have a `@Singleton` scoped `AppComponent` that resides within your `Application`
* Have a `@PerActivity` scoped `ActivityComponent` that lives along with your activity, as the name might suggest

Components are nothing but POJOs. They create and hold your objects&mdash;and nothing more. A frequently asked question is how long a component *lives*, and the short answer is that it lives as long as you keep a reference to it. Since your `ActivityComponent` will be created in `onCreate` and provide objects like `FragmentManager` or the `Activity` itself that are *unique* to this activity, you should **never** keep a reference to this component longer than your activity object.  
If you find yourself using static variables for components **you are doing something wrong**. This *will* lead to memory leaks and side effects.

There is no need to call `mComponent = null` in `onDestroy` because the garbage collector will just collect the component along with your activity. If the activity gets recreated you just create a new component.

### Providing objects

You should know by now that components will provide you with your dependencies when needed. To do so, components have multiple options:

* use an object of its parent component (see [Subcomponents](#subcomponents))
* use an object exposed by a component it depends on (see [Component Dependencies](#component-dependencies))
* use an object provided by a [module](#modules), or
* create the object itself with [constructor injection](#constructor-injection)

Generally speaking, you should try to **maximize** the usage of **constructor injection**. It is the easiest maintainable way to provide your dependencies, and you will never have to write any `new XYZ()` calls again.

### Component Dependencies
A component dependency is one component depending on another. Compared to [subcomponents](#subcomponents), a dependent component can *only use exposed objects* from its dependency.

{%highlight java%}
@Component
interface AppComponent {
    Gson getGson(); // expose object to subgraph
}

@Component(dependencies=AppComponent.class)
interface ActivityComponent {}
{%endhighlight%}


### Subcomponents
A subcomponent will *share* their entire parent's graph and may also extend it.
It gets created by calling a method on the parent's interface, possibly supplying needed modules.

{%highlight java%}
@Component
interface AppComponent {
    ActivityComponent plus(ActivityModule module);
}

@Subcomponent(modules=ActivityModule.class)
interface ActivityComponent {}

ActivityComponent activityComponent
        = DaggerAppComponent.create()
            .plus(new ActivityModule());
{%endhighlight%}

### Constructor Injection

Constructor injection requires that you have an `@Inject` annotated constructor for your object. Dagger will be able to create your object iff every dependency&mdash;the constructor parameters&mdash;can be supplied. Those dependencies could be created by constructor injection themselves, or make use of any of the other [possibilities to provide objects](#providing-objects).

{%highlight java%}
class MyManager {
    Gson mGson;
    
    @Inject
    MyManager(Gson gson) {
        mGson = gson;
    }
}
{%endhighlight%}

#### Scoped Constructor Injection

If you want to scope objects&mdash;so that they will only be created *once* within their scope&mdash;and still use constructor injection then you can do so by just annotating *the class itself*. The component will create one object when required and hold it for you.

{%highlight java%}
@Singleton
class MyManager {
    @Inject
    MyManager() { /**/ }
}
{%endhighlight%}


## Modules
First off, don't use modules *unless you need to*. And even when you need to use modules, try to use constructor injection *within* them. I'll get to this again later.

Modules provide objects that cannot be provided in some other way. This includes third party libraries without `@Inject` annotated constructors, or e.g. your `Activity` for which Android will handle the creation, and if you use interfaces, modules can help you choose or even switch between their implementations.

### Scopes

Scopes still work the same. Scoped objects can only be provided from components of the same scope.

You *do not* have to cache objects returned from modules yourself or use member variables. Unscoped methods will be called every time the dependency is required, while a scoped method&mdash;like the example below&mdash;will only be called *once* and the component will take care of holding and reusing the object returned.

{%highlight java%}
@Module
class GsonModule {
    // create a single Gson object
    //   that will be reused
    @Singleton
    @Provides
    Gson provideGson() {
        return new Gson.Builder()
        /* customize */
        .build();
    }
}
{%endhighlight%}

### Providing Interfaces

You might have multiple implementations for your interfaces or just want to use them properly. A mistake that I see very often is to use modules to provide those implementations for interfaces by creating and returning the implementation. While this approach is correct, the creation of the implementation can also be handled using constructor injection, which will rid you of typing (and updating) your constructor call:
{%highlight java%}
// make use of constructor injection!
@Provides
MyInterface provideMyInterface(MyInterfaceImpl implementation) {
    // dagger will create the implementation
    // you just return it.
    return implementation;
}
{%endhighlight%}

If your interface depends on the implementation of itself, Dagger will create your implementation for you. You then can just return the implementation when your interface is needed&mdash;and never call `new` again.

And while the above approach works quite well, a new `@Binds` annotation was added to Dagger to support this exact use case. If you are using an interface or abstract class as your Module you can also use the following.

{%highlight java%}
@Binds
MyInterface provideMyInterface(MyInterfaceImpl implementation);
{%endhighlight%}

Not only is it less code to write, you should try to use `@Binds` whenever possible since Dagger can do further optimizations that might not be possible by just using `@Provides`.


## Summary

If you read everything until here I hope that you gained a good picture about how Dagger operates and how to declare components that will create and provide your dependencies. To help them set up more complicated objects you can use modules, but Constructor Injection is the easiest way to go whenever possible.

In the end you should just go try it and play around. I like to just open a single file in my project and start declaring components, modules, and classes. This allows for easy experimentation and since Dagger is run at compile time you will get quick feedback about the setup, and learn how things fit together.
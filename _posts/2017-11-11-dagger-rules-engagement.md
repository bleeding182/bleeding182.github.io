---
layout: post
title:  "Dagger 2 &ndash; Rules of Engagement"
description: Simple rules to follow to clear up some of the confusion surrounding Dagger when starting out.
categories: android
tags:
- dagger-2
published: true
excerpt_separator: <!--more-->
---

For the love of logic, stop reading some Dagger tutorial, copy-pasting some code, and then expecting magic to happen. Dagger does not magically set your variables and remove nulls from your code. You have to understand how Dagger works _before_ using it, or you will end up creating more work than you tried saving.

This said, Dagger is not as complicated as it may seem. It follows a few basic rules, so by knowing those rules, you know Dagger.

<!--more-->

## 1. Components do the work

Components create and store your objects. They know about your project and know how to resolve your dependencies. They are the backbone of Dagger and your entry point into Dependency Injection. In short, components create your objects and by utilizing Dagger there is no more need to create every object manually. After all, why use Dagger if you insist on micromanaging your object creation?

## 2. You have to call Dagger or nothing will happen.

Sprinkling `@Inject` all over your code will do nothing. As I said before, Dagger is not magic. Components do the work, but since this is Java, someone&mdash;you&mdash;has to create and call the component.

Dagger will generate a lot of code that will create and provide all sorts of dependencies, but you still have to call it at _some_ point, or all that generated code will never be run.

> **Note:** If you're using `dagger.android` it might seem like no one is creating or calling the components, but this is still happening. Depending on your setup all of this happens when you call `AndroidInjection.inject(this)` or within the LifecycleCallback you registered.

## 3. Components can be called in 2 ways

You will have seen calls to `component.inject(this)` in most tutorials, so you should know that this will inject any public or package private fields in your class annotated with `@Inject`. This, though, should _only_ be used with classes where you can't declare a custom constructor, like Activities and Fragments in Android, since the system will create them for you.

But you can also get objects directly from a component by declaring another method in the interface. You _could_ also use this to assign your fields manually instead of using field injection, but this would scale really badly.

{% highlight java %}
@Component
interface MyComponent {
  MyObject getMyObject();
}
{% endhighlight %}

If you call `component.getMyObject()` the component will return it to you. This second way of interfacing with Dagger is called a _provision method_ and gets interesting when dealing with component dependencies. You will most likely not be using this method a lot, but it is always good to know one's options.

Those two ways provide an entry point for Dagger, to inject your framework type, or for you to retrieve some fully set-up objects, but for the most part of your code you should...

## 4. Use constructor injection

While you _could_ use the aforementioned `component.inject(this)` (field injection) to inject the desired fields of every object manually, this is probably also the most laborious thing you could do. You'd have to pass the component around, you'd have to declare a method in the component for every single one of your classes, you'd have to invoke the inject method for every single object after its creation&mdash;and yet this is how some people try to get started with Dagger. I won't blame them if they say it is overly complicated and adds a lot of boilerplate.

Use constructor injection and you get clean code that scales well. How? If you have a class that depends on another class, then you declare this dependency in the constructor. And to tell Dagger, "Hey, I know you're reading this, this is how to create my object," you annotate the constructor with `@Inject`. That's all.

{% highlight java %}
class MyClass() {

  private MyDependency dependency;

  @Inject
  MyClass(MyDependency dependency) {
    this.dependency = dependency;
  }
}
{% endhighlight %}

Please note the _single_ `@Inject` _on the constructor_. There is no need to mark the fields and they can be private as they should. Dagger now knows about `MyClass` and will create it with a `dependency` passed into the constructor. Isn't this easier to read than having all those `.inject(this)` calls and annotated fields everywhere?

This also means that you _don't_ need to use modules all the time! Any class that has an `@Inject` annotated constructor can be created by Dagger without any further setup! This is how we can save a lot of time and effort with Dagger:
Focus on writing your code, properly list your dependencies, and just assume that someone will pass them into your constructor. Dagger will take care of the rest.

If you use constructor injection, then Dagger can create those objects _for you_. Declare your dependencies and Dagger will provide&mdash;be it field injection, constructor injection, or by invoking a provision method mentioned above. You should not call `new MyClass()` unless you explicitly want to manage the object creation yourself.

## 5. Modules only when needed

You are probably using Retrofit, OkHttp, etc. You might have noticed that they usually don't let you create their objects directly, but you have to call a `Builder` and do some setup. Since you don't have access to the code you can't make use of `@Inject` annotated constructors either. This is what modules are for!

In modules you can define provider method bindings that will be called when Dagger needs to create a specific object, and they work like constructors. To tell Dagger about the method, you add a `@Provides` annotation on it. Any dependencies that you might have&mdash;you guessed it&mdash;you add as an arguments to your method.

{% highlight java %}
@Module
class HttpModule() {

  @Provides
  Retrofit provideRetrofit(OkHttpClient client) {
    Retrofit retrofit = new Retrofit.Builder()
        .baseUrl("https://api.github.com/")
        .client(client)
        .build();
  }
}
{% endhighlight %}

This lets Dagger know that this module can provide `Retrofit` and Dagger will call this method, passing in an `OkHttpClient`, when it needs to create the object.

> **Note:** Modules can do more than that, like  [binding implementations to their interfaces here][interfacebinding], but for now I'd like to stick to the bare basics.

## 6. Scopes contain an object only once.

What's the difference between `@SomeScope class MyClass` and `class MyClass`?   
If you inject the former multiple times, you will end up with the very same object instance every single time. If you try to do so with the latter, you will always receive a new object.

{% highlight java %}
component.getMyClass() == component.getMyClass() // true if scoped
{% endhighlight %}

Scope annotations are added to your class directly when using constructor injection or the `@Provides` annotated method in your module. It says that there will be a single scoped object within its scope. It does not matter what the scope is called, be it `@Singleton` or `@Wubbalubbadubdub`. Most developers choose the `@Singleton` name for their root component, but `@AppScope` or `@PerApplication` will work exactly the same.

If you re-create your component, your scoped objects will be re-created with the component, no matter the scope. So if you were to have a `@Singleton AppComponent` that provides a `@Singleton class MyClass`...

{% highlight java %}
// two different components -> two different objects
DaggerAppComponent.create().getMyClass() != DaggerAppComponent.create().getMyClass()
{% endhighlight %}

Components are but simple Java objects themselves. There is no global state or static variables caching values and if you want to keep components along with their objects you will have to keep them somewhere yourself. This is why most tutorials will store the AppComponent in the Application itself. You create it once and then use it throughout your app.

## 7. Scopes introduce a hierarchy

{% highlight text %}
@Singleton AppComponent
 \_ @PerActivity ActivityComponent
     \_ @PerFragment FragmentComponent
{% endhighlight %}

If you know about DAGs (Directed Acyclic Graphs) this is everything you need to know about scopes. If scope B depends on scope A, then A MUST NOT depend on B, or you would have a dependency cycle&mdash;and Dagger will refuse to compile your code.

If B is a subcomponent of A, then it can use anything within A. If you're using component dependencies then B would be limited to things exposed by provision methods of A (methods without parameters that return an injected or provided type).  
This is why your ActivityComponent can use your `@Singleton` objects, but why a `@Singleton` scoped object can't depend on an Activity.

It does not matter how many different scopes you use or how you name them. In the end you just need to make sure that there are no cycles, then everything will work fine.

But there is no need to scope every little helper class. Scopes are needed when there is some state involved, where it is important that you receive the same object, or when you would be recreating the same object over and over again, but for the last example you could also use `@Reusable` instead of a scope to let Dagger handle this.

## 8. Read your compile errors

Last but not least, you will encounter a lot of errors. Dagger is very strict. It uses annotation processing to get the information about your project and it will fail a build if it is missing something or discovered some error.

Make sure to _read_ the error. The error will usually pop up in your IDE informing you of a failed build, but if you can't immediately find it, you can always check the gradle console to see the raw output.

Those error messages will always include the full class name of any affected piece of code. Read them thoroughly and make sure to check every class mentioned. Most often you'll have switched an interface with an implementation, or you're looking for something in the wrong scope. You can Google (or Bing?) any words you don't know and search the Dagger documentation. Usually things will clear themselves up pretty quickly and before long you'll be quick to fix any errors you might encounter.

You can have a look at [How do I fix Dagger 2 error '… cannot be provided […]'?][fixprovides] for an example of an error that you will encounter sooner or later.

## Don't make things unnecessarily hard.

I know, I already handled this with _4. Use constructor injection_ and _5. Modules are for libraries_, but this is the single mistake I see the most often.

{% highlight java %}
@Module
class MyModule {
  @Provides
  MyInterface provideMyInterface() {
    // DON'T DO THIS.
    return new MyInterfaceImplementation(); // wtf why? Use constructor injection!
  }
}
{% endhighlight %}

Unless you get paid by lines of code, this is not what you want to be doing. Not only do you have to create the object yourself, you also need to add more modules to your components, etc. Your project will be bloated with boilerplate that you wanted to eliminate.

Of course there sometimes will be a need to bind your interface to an implementation, and you have to use modules to do so, so this is how to do it right:

{% highlight java %}
@Module
class MyModule {
  @Provides
  MyInterface provideMyInterface(MyInterfaceImplementation implementation) {
    // Dagger can provide the implementation with constructor injection
    return implementation; // just return it!
  }
}
{% endhighlight %}

And as you can see this is pretty straightforward, which is why Dagger can even do this _for you_ in abstract modules or modules that are declared as interfaces by using `@Binds` instead of `@Provides` with the method...

{% highlight java %}
@Module
interface MyModule {
  @Binds MyInterface provideMyInterface(MyInterfaceImplementation implementation);
}
{% endhighlight %}

You should always have a reason _why_ you use a module, otherwise you might be adding more overhead than necessary. Favor constructor injection above anything else.

## Final words

This is not a full guide. This post is intended for people starting out to clear some things up and avoid common mistakes. There are plenty of good guides out there and I also wrote about [Dagger Basics][basics] with more in-depth details on how to _use_ Dagger. I'd also like to point you in the direction of [Keeping the Daggers sharp][squareblog] by Square with some more, advanced guidelines, as well as [That Missing Guide: How to use Dagger2][zhuinden] by Gabor Varadi, who gives a good overview on how to include Dagger in your project. He likes to use a slightly different approach from me, where he favors provision methods over field injection.

Make sure you understand what you're doing, form your own opinion, and&mdash;most of all&mdash;don't just copy-paste some code and expect it to work.

  [basics]:{{ site.baseurl }}{% post_url 2016-05-04-dagger-2-introduction %}
  [interfacebinding]:{{ site.baseurl }}{% post_url 2016-05-04-dagger-2-introduction %}#providing-interfaces
  [fixprovides]:https://stackoverflow.com/a/44912081/1837367
  [squareblog]:https://medium.com/square-corner-blog/keeping-the-daggers-sharp-%EF%B8%8F-230b3191c3f
  [zhuinden]:https://medium.com/@Zhuinden/that-missing-guide-how-to-use-dagger2-ef116fbea97

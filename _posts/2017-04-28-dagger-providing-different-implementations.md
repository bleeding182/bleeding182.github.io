---
layout: post
title:  "Providing Interface Implementations with Dagger"
categories: android
tags:
- rxJava
- loaders
published: true
excerpt_separator: <!--more-->
---

A lot of guides cover the basic setup of Dagger and how to use it in your projects, but how would you provide different implementations of an interface with Dagger? In the following I want to look at a real world example: A Car, that either could take a PetrolEngine or an ElectricEngine!

Now that we have a goal in mind all we need to figure out is how to do this with Dagger.

<!--more-->

Okay. So... a car. What am I talking about? Let me show you the models with which we are going to work:

{% highlight java %}
interface Engine {}

class Car {
  @Inject
  Car(Engine engine) { /* initialization */}
}

class PetrolEngine implements Engine { @Inject PetrolEngine() { /* initialization */ } }

class ElectricEngine implements Engine { @Inject ElectricEngine() { /* initialization */ } }
{% endhighlight %}

So to summarize: We have a car that needs an engine and we have 2 different engines to choose from. I'm using **constructor injection** with everything, since I believe this **is the way to go wherever possible.** It will keep your code cleaner and easier to maintain and most importantly: You _don't_ have to write thousands of `@Provides` methods in modules. If you don't really know what I'm talking about here you may also have a look at [Dagger 2 Basics][daggerBasics] and come back later.

### What are our possibilities?

We have to find some way to provide&mdash;maybe even dynamically&mdash;either a petrol or an electric engine. The following shows the straightforward approach that will provide one of the implementations how we all learned to do it, using the `@Binds` annotation to provide an implementation of an interface, which is also why the Module must either be abstract or an interface.

{% highlight java %}
@Module
interface PetrolEngineModule {
  @Binds Engine engine(PetrolEngine engine);
}

@Component(modules = PetrolEngineModule.class)
interface CarComponent {
  Car getCar();
}
{% endhighlight %}

While this fulfills one use case, we can not just dynamically switch modules at runtime, because the component directly references the module class. We could create 2 different car components, each using a different module, but this also does not solve our problem, it even duplicates perfectly fine code.

Also it should be clear that we cannot extract `Engine engine(PetrolEngine engine)` into a super interface and just use a different module at runtime, because those method signatures won't match. A `PetrolEngine` is not an `ElectricEngine` and Dagger needs to know which we want at compile time. While this might seem weird, the reason behind it is rather simple: Imagine the petrol engine needs gas, the electric one a battery. Those are different constructors, that require different objects. The component needs to know which types to supply, because `Engine` neither tells it about gas, nor batteries.

 Since we don't want to duplicate our car component, and we can't just switch modules, an easy approach one might come up with would look like the following: We just use the module to determine which implementation we want to use. The logic could be anything, whether it is a boolean parameter, or we pass in the Engine we want to provide as a whole. Let's have a look before we determine whether this is a better approach.

{% highlight java %}
@Module
class EngineModule {

  private Engine engine;

  EngineModule(Engine engine) {
    this.engine = engine;
  }

  @Provides
  Engine engine() {
    return engine;
  }
}
{% endhighlight %}

While this solves our problem, this ain't a clean solution either. We can now dynamically change the engine, but we just created the engine somewhere else! We pass it into the module, so that we can create the component that we actually wanted! All that we want to use Dagger for, we just did it ourselves and Dagger lost information about possible scopes and further dependencies.

Now that we know the caveats, we should try and come up with a simpler and cleaner solution. One where we can tell the component&mdash;while we are creating it&mdash;how it should get its engine. And since a module is not the solution, this just leaves one other way to provide a dependency to a component: another component.

### Why use component dependencies?

I doubt that component dependencies get used a lot since subcomponents are most often the easier way to go. But in this case we have a simple interface and we want to be able to declare which implementation we are going to use.

Another component is the solution here because of the shortcoming mentioned above, that a single component has no way to create an implementation of `Engine` without further information. Remember, Dagger works at compile time, so all the necessary information needs to be available at that point. Now imagine we have an `EngineComponent` that says it provides an engine. We can have different implementations of it, one to provide a `PetrolEngine`, and one to provide an `ElectricEngine`, but we can just depend on this interface and rest assured that we get an engine. Finally we can decide at runtime which component we want to use.

To do this we start by binding our modules to the engine implementations.

{% highlight java %}
@Module
interface PetrolEngineModule {
  @Binds Engine engine(PetrolEngine engine);
}

@Module
interface ElectricEngineModule {
  @Binds Engine engine(ElectricEngine engine);
}
{% endhighlight %}

Next we define our components and map them to our modules...

{% highlight java %}
interface EngineComponent {
  Engine engine();
}

@Component(modules = PetrolEngineModule.class)
interface PetrolEngineComponent extends EngineComponent { }

@Component(modules = ElectricEngineModule.class)
interface ElectricEngineComponent extends EngineComponent { }
{% endhighlight %}

Note that `EngineComponent` is _not_ a component by itself. It is a simple interface and all it does is tell the dependent component that whatever is _behind_ that interface knows how to create an engine. The last step is to link our `CarComponent` with a way to get an engine.

{% highlight java %}
@Component(dependencies = EngineComponent.class)
interface CarComponent {
  Car getCar();
}
{% endhighlight %}

And that's it! We now can swap whole components and provide different implementations all within the Dagger ecosystem. And in case you're wondering...well...how the hell am I supposed to do that now? Here's the final piece.

{% highlight java %}
EngineComponent engineComponent = DaggerPetrolEngineComponent.create();
DaggerCarComponent.builder()
    .engineComponent(engineComponent)
    .build();
{% endhighlight %}

#### This opens up some new possibilities

Keep in mind that Dagger is still pure Java and there isn't even any reflection going on. If you paid attention you might have noticed that since our component depends on a simple interface, we could just implement the interface ourselves!

Now I highly advise against doing so, but you could really just pass in your own implementation of the interface. After all, the components generated by Dagger just implement the interface, too. To prove my point, you could just do something like the following, and while it will work alright, you maybe just should let Dagger do its job.

{% highlight java %}
DaggerCarComponent.builder()
  .engineComponent(new EngineComponent() {
    @Override
    public Engine engine() {
      return new MysteryEngine();
    }
  })
  .build();
{% endhighlight %}

### What do I get out of this?

Most often you will be using only one implementation of an interface, or just scrap interfaces altogether. I wanted to show alternative options to deal with possibly more complex setups that you might encounter in one of your projects and give an overview about some other features of Dagger since not everything has to be done with subcomponents.

  [daggerBasics]:{% post_url 2016-05-04-dagger-2-introduction %}

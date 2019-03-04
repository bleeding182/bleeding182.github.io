---
layout: post
date: 2019-03-04 21:00
title:  "Binding Room to Dagger"
description:
categories: android
tags:
- room
- dagger
---

Binding Room to Dagger does not involve *any boilerplate* at all if we bind it as a dependency. Like Dagger, Room uses an annotation processor to generate the implementation of our database and DAOs. This implementation will create the DAOs the first time they are accessed, then cache the objects for future calls, limiting them to a single instance. Sound familiar? It should. This is very similar to what a Dagger component does with scoped objects&mdash;we can use this and bind the database as a dependency directly to our component. No need for any modules.

### What not to do

I wanted to write a quick article on how to bind Room to Dagger after seeing some tutorials online that will show you how to create a module and a bunch of `@Provides` annotated methods to achieve the same effect, but with much more boilerplate code. While this approach isn't wrong, it would be much more efficient to bind Room directly to Dagger. If you want to use a module, please make sure _not_ to add any scopes on the DAOs, only on the database itself. As mentioned before, Room already synchronizes the access to its DAOs, so all you get from those additional scopes is a slower runtime performance.

Have a quick look at the generated code yourself!

{% highlight java %}
@Database(
    version = 1,
    entities = {Demo.class})
public abstract class DemoDatabase extends RoomDatabase {

  abstract DemoDao demoDao();
}

public class DemoDatabase_Impl extends DemoDatabase {
  private volatile DemoDao _demoDao;
  
  @Override
  DemoDao demoDao() {
    if (_demoDao != null) {
      return _demoDao;
    } else {
      synchronized(this) {
        if(_demoDao == null) {
          _demoDao = new DemoDao_Impl(this);
        }
        return _demoDao;
      }
    }
  }
}
{% endhighlight %}

Since Room already implements an interface and applies its own "scope" we can add it _as a whole_ to our component. This way the database as well as all of the DAOs get bound and are ready to be used, without the need for more boilerplate code.

### Binding Room as a Component Dependency

[Component dependencies](https://google.github.io/dagger/api/2.21/dagger/Component.html#component-dependencies) enable us to bind an interface to our graph, adding all of the interface's provision methods as providers. In plain English this means that we can add our database and its DAOs directly to Dagger.

For example, we could bind `DemoDatabase` containing some `DemoDao` like the following:

{% highlight java %}
// add the database as a component dependency
@Component(dependencies = DemoDatabase.class)
public interface AppComponent {
  
  // thanks to the component dependency we have access to the DB and its DAOs
  // e.g. we could define provision methods, but we can inject them just as well
  DemoDao demoDao();
  DemoDatabase demoDatabase();
  
  @Component.Builder
  interface Builder {
    // add the database to our Builder, as we would with other dependencies
    AppComponent.Builder database(DemoDatabase database);
    
    AppComponent build();
  }
}
{% endhighlight %}

We add our Room database to the component and its builder, then we're set. The only thing that remains is to create and bind the database along with our AppComponent.

{% highlight java %}
DemoDatabase database = Room.inMemoryDatabaseBuilder(this, DemoDatabase.class)
  .build();

AppComponent component = DaggerAppComponent.builder()
  .database(database) // add database to component builder
  .build();

// and the database is ready to be used
DemoDao dao = component.demoDao();
{% endhighlight %}

---
layout: post
title:  "Working with multiple flavors and build variants"
categories: android
tags:
- gradle
- flavor
- build variants
published: true
excerpt_separator: <!--more-->
---

Flavors enable you to have multiple similar versions of your app within a single code base, like different colors, or the common example of a paid and a free version of the same app. They greatly increase maintainability, as well as publishing updates to multiple apps gets significantly easier. But while having different settings for every flavor is simple enough, things start to get really tricky if you introduce flavor dimensions and find yourself dependent on *combinations* of different flavors and build types.

Let's assume I have a *news* and a *blog* app. Both could be some sort of RSS reader and they share the same code base. I also have a *development* and a *production* environment, because I don't always test my code, but when I do, I test it in development! :)

The basic setup is simple and I define my flavor dimensions as well as my flavors. Because I actually have two different apps, each one has it's own unique `applicationId`.

{%highlight gradle%}
flavorDimensions "app", "environment"
productFlavors {
  news {
    dimension "app"
    applicationId "com.example.news"
  }
  blog {
    dimension "app"
    applicationId "com.example.blog"
  }
  development {
    dimension "environment"
  }
  production {
    dimension "environment"
  }
}
{%endhighlight%}

Now that things are set up I want to go ahead and add the URLs to my server and this is where things get complicated.

Since I have two apps each app has its own URLs, one for development, and one for production.

<!--more-->

## The obvious solution

But I read the documentation! If I have a flavor `development`, then I can just put all my resources into `src/development` and the resources will be merged! And in fact the same applies to flavor dimensions. I can just create an XML file and place it in `src/newsEnvironment/res`.  *(The order of the flavor names is the same you put in `flavorDimensions`)* I can do this for every one of my flavor combinations, and in the end I will have placed 4 files and multiple directories.

This might seem like a nice solution to some of you, but I don't like to have 4 files in my source sets to contain my build data. If I add another environment (*staging*, anyone?) this would mean I have to add yet another 2 files which makes it even harder to maintain the project. There could even be some values that some combinations share and I would end up copying values, and probably introduce bugs in the future.

Neither do I like using string files to contain constants&mdash;I prefer to use `BuildConfig` for this and I believe this is what it is intended for. I will have to find a way to do this with Gradle.

## Using constants

The Android Gradle plugin offers an easy way to add constants to your build variant with the `buildConfigField`. You can find it on flavors as well as build types and it will also take care of properly merging them. With just one app and 2 flavors this is fairly easy.

{%highlight gradle%}
development {
  buildConfigField "String", "URL", "\"dev.example.com\""
}
production {
  buildConfigField "String", "URL", "\"example.com\""
}
{%endhighlight%}

But this is just for a single dimension of flavors and if I have both, different apps and different environments, this construct suddenly seems not to be of any help anymore.

### Good ol' if/else

If you do your homework and look for some solution&mdash;maybe this is how you got here?&mdash;something you may come up with would look like this and it will just do its job...

{%highlight gradle%}
applicationVariants.all { variant ->
  if (variant.name.startsWith("newsDevelopment")) {
    variant.buildConfigField "String", "URL", "\"dev.example.com\""
  } /* else if (...) */
}
{%endhighlight%}

I think you can see how this would clutter up and become hard to maintain once there is not just a single URL, but multiple values for different combinations.  
Having a huge and growing if/else tree is not a good solution, so let's see what else we *can* do.

## The Gradle Way

Just what *is* a *build variant* anyway? A build variant is the combination of your flavors, build types, etc. and it contains all the data which will be used to build your app. Since we depend on combinations of flavors we actually need to set values for specific build variants to accomplish our goal. This is basically what the if/else solution above did, too. Let's move on.

Most Gradle objects are extension-aware. The most known Gradle object is probably `project`, but also tasks and flavors have their own extensions. But why am I telling you this? In the next snippet I will make use of extensions to define custom data to use later.

By using `project.ext` you can add data to your project at Gradle runtime. It enables you to pass configuration data around, and you might have seen all those examples about how to use those to pin version numbers for your dependencies. In this case we will be using the extensions on our flavors.

Since one app can have multiple environments, I'll define the environments in the app flavor. This is about build types and flavors, so I will simply add my URLs directly on the flavor, but if you really want to clean things up, you could just create complete custom extensions as well.

{%highlight gradle%}
news {
    dimension "app"
    applicationId "com.example.news"

    ext {
        development = "dev.example.blog"
        production = "example.blog"
    }
}
{%endhighlight%}

If you add an extension like displayed above, those values will be available to you when you call `news.ext.development`, or even shorter `news.development`, later.

There is also a reason why I named the extensions after my environment flavors. Since Gradle is dynamic and I can access those extensions like a map, I can just use the flavor names to look up the values.

{%highlight gradle%}
applicationVariants.all { variant ->
    def flavors = variant.productFlavors
    // flavorDimensions "app" -> 0, "environment" -> 1
    def app = flavors[0]
    def environment = flavors[1]

    variant.buildConfigField "String", "URL", "\"${app[environment.name]}\""
}
{%endhighlight%}

We read the property named after the environment from our app flavor and we use its value to create a `buildConfigField` on our variant. If we hit run and check the generated code, then we can see how it all worked out.

{%highlight java%}
public final class BuildConfig {
  public static final String APPLICATION_ID = "com.example.news";
  public static final String FLAVOR = "newsDevelopment";
  public static final String FLAVOR_app = "news";
  public static final String FLAVOR_environment = "development";
  // Fields from the variant
  public static final String URL = "dev.example.blog";
}
{%endhighlight%}

We did not get rid of the mess completely, but I prefer looking for my flavor setting _on_ the flavor, instead of some if/else construct.

{%highlight java%}
flavorDimensions "app", "environment"
productFlavors {
    news {
        dimension "app"
        applicationId "com.example.news"

        ext {
            development = "dev.example.blog"
            production = "example.blog"
        }
    }
    blog {
        dimension "app"
        applicationId "com.example.blog"

        ext {
            development = "dev.example.com"
            production = "example.com"
        }
    }
    development {
        dimension "environment"
    }
    production {
        dimension "environment"
    }

    applicationVariants.all { variant ->
        def flavors = variant.productFlavors
        // flavorDimensions "app" -> 0, "environment" -> 1
        def app = flavors[0]
        def environment = flavors[1]

        variant.buildConfigField "String", "URL", "\"${app[environment.name]}\""
    }
}
{%endhighlight%}

## So why would you need this?

Be glad if you don't. Usually you will have no or just a single layer of flavors and two build types and you can just forget about this post. Things mentioned here become interesting when your app has multiple dimensions and&mdash;most of all&mdash;you have dependencis on *specific* flavor combinations.

Remember, though, because once you arrive at this point this might just save your sanity.

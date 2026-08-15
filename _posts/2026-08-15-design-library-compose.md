---
layout: post
title:  "Build Your Own Compose Design Library for Great Good"
categories: android
tags:
- compose
- design-system
excerpt_separator: <!--more-->
---

You drop `material3` into your project and start coding away, but say you want to change some style down the line: now you gotta do a full usage search, figure out if that specific usage is part of your change, and change it. In every single place.

Now, "Of course", you'll say, "this is Compose, so we should create our own composable and we will use that instead." and you'd be right; this is the approach we will be discussing in this post. But there is one extra step that we can take to make this intent not only clear, but also enforce it as the default: modules.

<!--more-->

By building our own design library as a module we can add our design frameworks _in a single place_ and _keep it hidden everywhere else_. If we can't import `material3.TopAppBar` we won't be tempted to use it either. Instead, we get _our own_ composables that use our own domain language. Names can include a semantic meaning on how they should be used&mdash;without worrying about how it ultimately looks.

The upcoming styles API might help with using uniform styles, but it doesn't prevent the underlying problem. It still allows overrides anywhere; our own composables expose only what we deliberately want to be configurable.

## Not Convinced Yet?

Skip ahead if you're here for details. In any other case let's take a look at two snippets of code that would result in the same UI. Which one would you rather work with?

Let's start with a declarative, material-esque approach. Component imports aliased for clarity.

{% highlight kotlin %}
import androidx.compose.material3.Scaffold as M3Scaffold
// ...

M3Scaffold(
    topBar = {
        M3TopAppBar(
            title = {
                M3Text(
                    style = MaterialTheme.typography.titleLargeEmphasized,
                    text = "Home",
                )
            },
            navigationIcon = {
                M3IconButton(onClick = {}) {
                    M3Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = null,
                    )
                }
            },
        )
    },
) { paddingValues ->
    Column(modifier = Modifier.padding(paddingValues)) {
        M3Text(
            style = MaterialTheme.typography.bodyLarge,
            text = "Hello World",
        )
    }
}
{% endhighlight %}

Everyone can read this code. Everyone is familiar with this type of code. Everyone can copy & paste this code. And if we keep going like this we will end up with a lot of duplication that looks similar and is hard to maintain. Have fun changing the `TopAppBar` title font on every single screen.

Now, how can we do better? Composables are cheap to declare, cheap to implement, and all of the Kotlin language goodies apply as well. As mentioned before, the first step is to _wrap everything_. We do not want any `material3` imports anywhere outside of our design library. At the same time, we hide away the style & implementation details. An app usually has one, maybe two distinct Top Bars, so we give each one a name and expose only what we want to adjust.

{% highlight kotlin %}
Scaffold(
    topBar = {
        Normal(
            title = "Home",
            navigationIcon = { Up(navigateUp = {}) },
        )
    },
) { paddingValues ->
    Column(modifier = Modifier.padding(paddingValues)) {
        BodyText(text = "Hello World")
    }
}
{% endhighlight %}

Much cleaner. And we didn't lose any style information, but rather hid it away. This semantic naming allows us to focus on our feature, to choose between a "normal" or any other declared variant for our Top Bar. We are no longer trying to figure out which color or font we need to use.

`Normal()` and `Up()` might seem like bad names for composables, but that's where we get into defining our own scopes.

## Adding Custom Scopes

Sticking with the Top Bar example from above, there is a good chance that you won't be placing `TopAppBar()` anywhere outside of a `Scaffold`. So why not hide it away? We know what we want and where we want it and Compose offers a way to do just that: Scopes.

{% highlight kotlin %}
import androidx.compose.material3.TopAppBar as M3TopAppBar

@Immutable
@LayoutScopeMarker
interface TopBarScope

@Composable
fun Scaffold(
    topBar: @Composable TopBarScope.() -> Unit = {},
    content: @Composable (PaddingValues) -> Unit,
) { /* .. */ }

@Immutable
@LayoutScopeMarker
interface NavigationIconScope {
    @Composable
    fun Up(navigateUp: () -> Unit) =
        IconButton(onClick = navigateUp, icon = AppIcons.arrowBack)
}

internal object NavigationIconScopeImpl : NavigationIconScope

@Composable
fun TopBarScope.Normal(
    title: String,
    navigationIcon: @Composable NavigationIconScope.() -> Unit = {},
) {
    M3TopAppBar(
        title = { Text(text = title) },
        navigationIcon = { navigationIcon(NavigationIconScopeImpl) },
    )
}
{% endhighlight %}

Scopes allow us to define components for individual slots opening up lots of possibilities. This is what we saw in the example above and what makes `Up()` a well named composable _for that slot_ without leaking anywhere else.

## How to Structure a Design Library?

If you haven't heard of [Atomic Design](https://atomicdesign.bradfrost.com/chapter-2/) yet, you should really go ahead and check it out right now. Atoms, molecules, and organisms define the building blocks for our apps. We give them names with meaning and put them together to create beautiful, consistent user interfaces.

We can apply that same naming structure to our module.

{% highlight txt %}
design/
  theme/      Theme object, colors, typography, etc
  atoms/      Button, Text, Card, TextField, Icon, Switch
  molecules/  AvatarImage, AlertDialog, ...
{% endhighlight %}

Play around and see what works for you. The important part is that this module is the _only_ place with access to Material3 or any other UI framework you may use. Wrapping all those composables can be a little nerve-wracking&mdash;looking at you `Scaffold`&mdash;but the end result is more than worth the effort.  
New Features & Screens just _fall into place_ because the building blocks already exist.

This is also where your Previews belong. A component that lives in one place can be previewed in one place, in all of its states, next to the code that defines it.

## Having Gradle Enforce It

All of this rests on the concept of only seeing our own, semantically named composables; that we _can't_ import `material3` outside the design library. While we could make it a pure convention, it is much easier to prevent any issues in the first place by having Gradle do the heavy lifting.

{% highlight txt %}
:app
  ├─ implementation androidx.compose.ui
  ├─ implementation androidx.compose.foundation
  └─ implementation :design                       depends on our own design lib
       ├─ implementation androidx.compose.ui
       ├─ implementation androidx.compose.foundation
       └─ implementation androidx.compose.material3  <- single place, hidden within
{% endhighlight %}

Gradle keeps dependencies added with `implementation` scoped to that single module without them leaking out. Whenever you find yourself lacking a certain composable there is but one place to add it.

## Where to Go From Here

There are a few things that I glossed over. Let's be completely honest: wrapping the Scaffold is quite awkward the first time around. If you stick with the rule, then you need to create your own variant for every interface and every scope. At the same time, the end result is really great. The example above is kept short on purpose, but in a real app you can move a lot of common behavior into your custom Scaffold: Pull-To-Refresh, Progress, Scroll Behaviors, etc.

Screenshot testing is certainly something that feels right at home here as well. Material 3 keeps changing all the time and your app could end up looking quite different from one version to the next. Golden tests can help avoid any unforeseen changes since your tests would fail and point out what changed.

## Wrapping Up

Instead of duplicated, hard-to-maintain code, a design library allows us to give composables semantic meaning _in our project_. Usage search is trivial: if we look for usages of our `Normal()` Top Bar, we can be certain that every single one of those screens uses the exact Top Bar that our design system defines.

Changes to our design are also clearly visible: we see the diff in the module along with the Previews outlining what it is, how it looks, and how it behaves.

It isn't free. We pay up front, in wrapper code and some boilerplate&mdash;but we pay it once per component, not once per usage.

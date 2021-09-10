---
layout: post
title:  "Dynamic Theme Colors at Runtime"
categories: android
tags:
- resources
- themes
---

Android Theming works great once you _really_ get into it, but one of the biggest limitations is that you can't modify those themes at runtime. You can override some values, but you always need to know those colors at compile time and create more themes or theme overlays.  
You can achieve dynamically colored themes with some libraries that will either use their own View implementations or some amount of workarounds to get it working _good enough_ but not completely.

Android 11 added the option to include your own [Resource Loaders](https://developer.android.com/about/versions/11/features#resource-loaders) and with that we finally have a way to dynamically alter our apps themes dynamically.  
We can tell Android to load a separate file which will override any existing resources, so we could for example change our `colorPrimary` and marvel at how all buttons, colors, etc will _just work_ as if we had switched the color at compile time.

## Demo Time

To test this, I created a very basic app with a theme that uses some primary, primary dark, and accent color with the colors defined in some `res/values/colors.xml` like we're used to. I used some dim, gray colors where I'd notice any change to something more colorful immediately.

{% highlight xml %}
<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="primary">#666666</color>
  <color name="primaryDark">#444444</color>
  <color name="accent">#bbaa44</color>
</resources>
{% endhighlight %}

Then we need to create the same colors for our resource override file. Note that `aapt2` requires the path to be the same as it would be in your android directory, so for me I put the overrides in `overrides/res/values/override.xml` which I then compiled. (Note: You can download aapt2 from its [documentation page](https://developer.android.com/studio/command-line/aapt2#download_aapt2))

> aapt2 compile res/values/override.xml -o compiled/

This will produce `compiled/values_override.arsc.flat` which contains our data. But we still need to package this once more for consumption, but here's where it gets a little tricky. To run `aapt2 link` we need to provide an `AndroidManifest.xml`, but a basic and mostly empty manifest seems to be good enough:

{% highlight xml %}
<?xml version="1.0" encoding="UTF-8"?>
<manifest package="com.davidmedenjak.dynamicresourceloader">
    <application/>
</manifest>
{% endhighlight %}

And while we could run the link command now, it still wouldn't work. Since we're only compiling a few colors, the resource IDs won't match the ones in our APK, so it'll probably still override _something_, but most likely not what we want. And the best part is, those IDs are also quite likely to change when you add/remove resources or recompile your app. We'll take a look at how we can improve this later, but for now we continue to just make it work once.

The simplest solution to get the IDs for me was to look at the APK file in Android Studio via `Build > Analyze APK...`. We can take note of those IDs and move on to the final steps...

![APK Inspection]({{ site.baseurl }}/assets/dynamic-resources/apk.png)

All that's left is to tell `aapt2` about our IDs and to do this we can run `aapt2 link -o override.apk --manifest AndroidManifest.xml compiled/values_override.arsc.flat --emit-ids themeids` which will write the assigned IDs to a file which **we can edit to include our actual IDs**. In the end it should look somewhat like this:

{% highlight txt %}
com.davidmedenjak.dynamicresourceloader:color/primary = 0x7f0500d6 // your IDs will be different!
com.davidmedenjak.dynamicresourceloader:color/accent = 0x7f0500d7
com.davidmedenjak.dynamicresourceloader:color/primaryDark = 0x7f0500d8
{% endhighlight %}

We save the file and now we can build our override file.

> aapt2 link -o override.apk --manifest AndroidManifest.xml compiled/values_override.arsc.flat --stable-ids themeids

And we got ourselves our packaged resources.

### Including the Resources

For the demo I included the above APK in my `src/assets` from where I copied the content to a temporary directory, unzipped it, and loaded it into my resources. To make sure our values get applied to the Activity itself as well we can do our setup in `Application.onCreate()`.

{% highlight kotlin %}
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        
        val file = File(cacheDir, "overrideResources")
        unzip(ZipInputStream(assets.open("override.apk")), file)
  
        val rl = ResourcesLoader()
        rl.addProvider(ResourcesProvider.loadFromDirectory(file.path, null))
        resources.addLoaders(rl)
    }
}
{% endhighlight %}

And that's it! Quite a lot. I know :/ But it works! The toolbar, the buttons, everything should have the new colors applied. I created a red, green, and blue override and it just works! But now that we know _how_ it works, let's take a look how we can actually use this, without all those manual steps involved.

## Reading the IDs and Compiling the Resources

This step was completely manual for our proof of concept, but to make it work in a production environment this step needs to be automated.

We could take the final APK and extract the needed values as another build step. With this our backend could prepare the correct files and we can download them as/when necessary. The obvious downside of this approach is that our backend needs to be aware of our releases which can prove as a challenge on its own.

Alternatively we can look at the IDs at _runtime_ and compile the resources dynamically. By calling `resources.getIdentifier("primary", "color", packageName)` we can get the actual ID for the resource to use. But `aapt2` is a couple of MB in size, so on top of the challenge to integrate some native calls to compile the resources, we also bloat our app quite a bit.

But we might also move this second approach to a server. We can call it with our final resource IDs, and the overridden resources can then be generated and cached on demand. This would allow for a quick and easy integration that would work for test/debug builds as well. We just need a little more setup when downloading our runtime color configurations.

## Is this Feasible?

I love the fact that this works. Although I'd not call it feasible&mdash;yet. Android 11 has been around for a year, but we can hardly bump our `minSdk` to `30` just yet. It might be a viable solution to offer the feature to newer devices only, but seeing that more than half of devices would not be eligible at the point of writing, this seems like a rather long shot.

Going forward this should open some interesting possibilities and maybe somebody will take this article and write a library which would make the whole setup trivial.
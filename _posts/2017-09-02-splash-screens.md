---
layout: post
title:  "How to Add a Splash Screen&mdash;The Right Way"
categories: android
tags:
- splash screen
- theme
published: true
excerpt_separator: <!--more-->
---

There are a lot of different approaches on how to add a splash screen to your app. Whatever your approach, it will be fine unless you use a dedicated SplashActivity. Using an activity as a splash screen is just wrong, and it will mess up your navigation sooner or later. After all, a splash screen should be shown while the app is loading and it should not depend on where a user comes from or what started the app. In the following, I want to show an easy setup that needs only minimal changes to your existing code base.

<!--more-->

### What's the setup?

The way to show a splash screen is to use the `android:windowBackground` attribute of your theme which will be shown until the app has finished loading and your first layout gets rendered. If you were to show a simple SplashActivity, its `windowBackground` would still be shown while the app is loading before your fancy layout would be drawn, rendering the SplashActivity obsolete. An activity-based approach would also require you to route all navigation through this one activity which is bound to get out of control sooner or later. That's definitely not what we want, which is why we use the `windowBackground` to draw our splash screen and then swap it for the right background once the app finishes loading.

Reusability is always important and nobody likes copying code around, so we will register an `ActivityLifecycleCallbacks` to manage all activities at once. The callback will swap the background and all we need to do is register it once.

#### The Splash Screen

Let's start by defining a simple drawable that will be used as the splash screen. Keep in mind that for this to work on versions prior to Lollipop we need to use a rasterized bitmap image and since this is only a drawable and not a view, we do not have support for text. If you have to display text, you will need to rasterize it as well.

{% highlight xml %}
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">

    <item>
        <color android:color="@color/colorPrimary"/>
    </item>

    <item>
        <bitmap
            android:gravity="center"
            android:src="@mipmap/ic_launcher"/>
    </item>

</layer-list>
{% endhighlight %}

We use our primary color as background and just place the launcher icon on top. This is just a basic example and you can go nuts if you feel like it ;)

#### Registering the Splash Screen

After creating the splash screen we need to add it to our app. To do this we need to

* create a theme with the splash screen
* use this theme for all our activities
* swap the theme for the 'right' one when the app finishes loading

Creating a theme should be straightforward. The most important part here is that we assign our drawable to `android:windowBackground`.

{% highlight xml %}
<style name="SplashTheme" parent="Theme.AppCompat">
    <item name="android:windowBackground">@drawable/splash_screen</item>
</style>
{% endhighlight %}

It is now time to add our theme to the manifest. I just applied the `SplashTheme` to the `application`, since it's easier than to apply a theme to every activity. You should also use a custom `Application` to register the callback in the next step. Mine is just called `App`.

{% highlight xml %}
<application
    android:name=".App"
    android:icon="@mipmap/ic_launcher"
    android:label="Splash Light"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:theme="@style/SplashTheme">

    <activity
        android:name=".MainActivity">
        <intent-filter>
            <action android:name="android.intent.action.MAIN"/>
            <category android:name="android.intent.category.LAUNCHER"/>
        </intent-filter>
    </activity>

</application>
{% endhighlight %}

Just make sure that you don't assign any themes to your activities, or you will override the splash theme, which would defeat the purpose. We have a working splash screen now, but we also need to hide it again. Open up your `Application` and make sure to register the callback.

{% highlight java %}
class SplashScreenHelper implements Application.ActivityLifecycleCallbacks {

  @Override
  public void onActivityCreated(Activity activity, Bundle savedInstanceState) {
    // apply the actual theme
    activity.setTheme(R.style.AppTheme);
  }

  // ... other callbacks are empty
}

public class App extends Application {

  @Override
  public void onCreate() {
    super.onCreate();

    // register the util to remove splash screen after loading
    registerActivityLifecycleCallbacks(new SplashScreenHelper());
  }
}
{% endhighlight %}

This is all we need and we now have a working splash screen. If you stick around for another moment, I will now show how to support more themes than one.

### Adding support for multiple themes

We have a working splash screen now, but `setTheme(R.style.AppTheme)` might not be what we want for _every_ activity. To support different themes we need to pass some metadata in to tell our helper which theme to apply.

{% highlight xml %}
<activity
    android:name=".MainActivity">
    <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
    </intent-filter>

    <!-- Add theme information to show after the splash screen -->
    <meta-data
        android:name="theme"
        android:resource="@style/AppTheme"/>
</activity>
{% endhighlight %}

As you can see I meant `meta-data` quite literally. We now add support to read the theme and might even add a fallback or default theme.

{% highlight java %}
@Override
public void onActivityCreated(Activity activity, Bundle savedInstanceState) {
  try {
    ActivityInfo activityInfo = activity.getPackageManager()
        .getActivityInfo(activity.getComponentName(), PackageManager.GET_META_DATA);

    Bundle metaData = activityInfo.metaData;

    int theme;
    if (metaData != null) {
      theme = metaData.getInt("theme", R.style.AppTheme);
    } else {
      theme = R.style.AppTheme;
    }

    activity.setTheme(theme);
  } catch (PackageManager.NameNotFoundException e) {
    e.printStackTrace();
  }
}
{% endhighlight %}

And that's it! There is a full example on [how to do splash screens on GitHub][1] showcasing a light and dark theme.

Next, we can improve the transition by [animating the splash screen]({{ site.baseurl }}{% post_url 2019-05-17-animated-splash-screens %}) while the content is loading.

  [1]:https://github.com/bleeding182/samples/tree/master/SplashScreen

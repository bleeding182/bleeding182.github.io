---
layout: post
title:  "Instrumentation Tests and Localized Screenshots"
categories: android
tags:
- instrumenation tests
- localization
published: true
excerpt_separator: <!--more-->
---
Testing is important, and you should be [testing](https://www.youtube.com/watch?v=RlfLCWKxHJ0&list=PL693EFD059797C21E).

Testing on Android is still a big issue. Whether you feel that your app isn't big or popular enough, or just don't know how to start, there are many reasons why you won't get involved with tests. But I find that writing testable code (and actual tests) can lead to far better, scalable, and maintainable software.

<!--more-->

## Instrumentation Tests
These are probably the more complex tests that you find yourself doing on Android. On the one part you can't just run them in your local JVM and on the other one there are lots that can go wrong.  Since you will work with your app's UI they are mostly integration or end-to-end tests.

Currently, there are two methods to running instrumentation tests: either run activity tests in isolation or use UIAutomator (API >= 18) and really just go with the UI. Since I want to write about taking screenshots, I will go with the latter.

The setup is fairly easy and there is good [documentation][1] on how to [run UIAutomator tests][2]. There is even a good tutorial on how to make [Screenshots Through Automation][3] that still covers the basics,  although gradle support was added since.

## Repeatable Tests. Consistent Screenshots.
Just running your app against your instrumentation test will probably lead to multiple problems. Dynamic data will change the actual look of your screens across devices and locales.

You need to supply test data along with a stable environment the test can run in.  This is hard.

If you chose to use Dependency Injection (e.g. [Dagger][4]) you're off easy. You can touch your application and hence inject your test dependencies.

### Varying Locales
There is always the possibility of changing locales by going through your phone's UI as described by Flavien Laurent's [blog post][3] already linked earlier. I found it easier just to override the app's locale and resources, though.

{% highlight java %}
Configuration config = new Configuration();
Locale.setDefault(mLocale);
config.locale = mLocale;
Resources resources = InstrumentationRegistry.getTargetContext().getApplicationContext().getResources();
resources.updateConfiguration(config, resources.getDisplayMetrics());
{% endhighlight %}

This will change the locale of the retrieved resources and formats returned by classes such as `DateUtils`. Be sure to start your activity with the `FLAG_ACTIVITY_CLEAR_TASK` flag set, so that your activity will be recreated from scratch after changing locales.

To get things going you can use `Parameterized Tests` to run the same test with different locales.

{% highlight java %}
@RunWith(Parameterized.class)
public class LocalizedTest {
    private final Locale mLocale;

    @Parameters
    public static Collection<Locale> locales() {
        return Arrays.asList(new Locale("en"), new Locale("de"), new Locale("fr"));
    }

    public LocalizedTest(Locale locale) {
        mLocale = locale;
        // - change locale for app -
    }

    // ... tests ...
}
{% endhighlight %}

Now with the locales set, we have to find a way to keep the content consistent. This can be a major issue, since tests are running in any order.

### Repeatable Tests are Good Tests
If you are using the aforementioned formula and have any kind of state in your app (Tutorial Screen, EULA) the first test might work fine but the second one will just fail. The tutorial was already shown. The button you were expecting nowhere to be found. You need to reset your user app data.

Don't bother trying to use `android.permission.CLEAR_APP_USER_DATA`: It is a system level permission and you will not get it on an unrooted device. If you're using `SharedPreferences` a simple call to `pref.edit().clear().apply()` might work. Wrapping those preferences with your own objects and passing them into activities as dependencies may be better.

{% highlight java %}
Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
App app = (App) instrumentation.getTargetContext().getApplicationContext();
{% endhighlight %}

This will provide you with your application instance. Build your object graph and inject it! If you're not using dagger you can still work with setters. Or get and clear the preferences. Or just switch to dagger ;)

{% highlight java %}
AppComponent component = new DaggerAppComponent.Builder().setApiModule(new TestApiModule()).setStateModule(new TestStateModule()).build();
component.inject(app);
{% endhighlight %}

This will help you to adapt the application to your needs. You can easily run tests with different data and be sure about your app's state.

Be sure to provide your test data for api calls, user data, and settings.

## Screenshots.
Last but not least now that your tests run in different locales with your static test data, wouldn't it be nice to automate taking your Play Store screenshots?

Up until now this post covered how to prepare your UI tests to switch locales and provide a static environment. We're ready to take screenshots.

{% highlight java %}
final File file = new File("/sdcard/" + Locale.getDefault().getLanguage() + "/screenshot.png");
final Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
boolean success = UiDevice.getInstance(instrumentation).takeScreenshot(file);
{% endhighlight %}

Take a screenshot and save it to a directory depending on its locale. Wrap that nicely in a method and add some permission checks for `WRITE_EXTERNAL_STORAGE`, failing your test if it is missing. You can again use your app's context to do this. Don't, and you will have passing tests without any screenshots delivered.

### Permissions and Getting the Screenshots
As mentioned, you will need the `WRITE_EXTERNAL_STORAGE` permission. The bad thing is you don't just get it. You will need to grant it. Which is not that easy when you're about to run a test depending on it.

`adb` to the rescue.

{% highlight shell %}
adb shell pm grant PACKAGE PERMISSION
{% endhighlight %}

Be sure to execute this task for any API >= 23 device you're testing. But...if you need to run it every time you could just add it to your build script. [Create a gradle task][5] and make your androidTests depend on it.

The same goes for the screenshots. `adb pull` works great. Another task in your gradle pugin works better. Be sure not to override screenshots in your output directory when pulling files from multiple devices, though.

## Conclusion
Run your test in different locales, provide test data, and take screenshots. With some fiddling around the whole process can be completely automated with some simple gradle tasks and could even be further enhanced by using tools like the [gradle play publisher][6] which could lead to fully automated Play Store uploads.

Thanks to Nicholas Liu for proof reading.

[1]: http://developer.android.com/training/testing/ui-testing/uiautomator-testing.html
[2]: https://blog.swanhtetaung.com/automating-android-screenshots-5b7574c0621d#.xt8dxrx0v
[3]: http://flavienlaurent.com/blog/2014/12/05/screenshot_automation/
[4]: http://google.github.io/dagger/
[5]: http://stackoverflow.com/a/34203293/1837367
[6]: https://github.com/Triple-T/gradle-play-publisher

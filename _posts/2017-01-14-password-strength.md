---
layout: post
title:  "Displaying Password Strength"
categories: android
tags:
- rxJava
- zxcvbn
published: true
excerpt_separator: <!--more-->
---

While I personally wish there was OAuth everywhere, most apps still require a password somewhere. So while building this sign up page you might just want to give your user a hint about the strength of their chosen password, whether you validate it or not.

![New constant variable]({{ site.baseurl }}/assets/password-strength/strength.gif)

<!--more-->

Dropbox released a neat library [zxcvbn][dbzxcvbn] which gives good feedback about the strength of a password. The Java port is called [zxcvbn4j][dbzxcvbn4j], which I will be using.

### Setup

To keep this all short and sweet I'll make use of Java 8 Lambda expressions (I prefer retrolambda over Jack) and RxJava. I also include RxBinding because it takes some additional work off when you try to observe Android components.  
To your `build.gradle` add the following:

{% highlight gradle %}
compile 'com.nulab-inc:zxcvbn:1.2.2'

compile 'com.jakewharton.rxbinding:rxbinding:1.0.0'
compile 'io.reactivex:rxjava:1.2.1'
{% endhighlight %}


Again, I want to keep it simple, so the layout consists only of the password field and a ProgressBar, which has a level from 0 to 4, depending on the password strength.

{% highlight xml %}
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    android:id="@+id/activity_main"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical">

    <EditText
        android:id="@+id/password"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="Password"
        android:inputType="textVisiblePassword"/>

    <ProgressBar
        android:id="@+id/progress"
        style="?android:progressBarStyleHorizontal"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:max="4"
        tools:progress="1"/>
</LinearLayout>
{% endhighlight %}

### Let's do this

The code itself should be pretty straightforward. We start by looking up our components, and then just listen to changes on the password input.

Whenever the password changes, we switch to a computation thread (zxcvbn will take some time) and update the ProgressBar with the result. And `onBackpressureLatest` is necessary when events get created faster than they can be handled.

A step by step explanation follows.

{% highlight java %}
@Override
protected void onCreate(final Bundle savedInstanceState) {
  super.onCreate(savedInstanceState);
  setContentView(R.layout.activity_main);

  final EditText password = (EditText) findViewById(R.id.password);
  final ProgressBar progress = (ProgressBar) findViewById(R.id.progress);

  final Zxcvbn zxcvbn = new Zxcvbn();

  // Listen to password changes on the EditText
  Subscription subscription = RxTextView.textChanges(password)
      // In case the events get emitted too fast
      .onBackpressureLatest()
      // Don't wanna block our UI
      .observeOn(Schedulers.computation())
      // EditText will return a CharSequence, zxcvbn needs a String
      .map(CharSequence::toString)
      // Do the magic
      .map(zxcvbn::measure)
      // read the score
      .map(Strength::getScore)
      // Update our ProgressBar
      .observeOn(AndroidSchedulers.mainThread())
      .subscribe(progress::setProgress);
}
  {% endhighlight %}

And that's it&mdash;with just a couple lines of code.

In case some things are not completely clear, check the following explanations.

{% highlight java %}
RxTextView.textChanges(password)
    .onBackpressureLatest()
{% endhighlight %}

`RxTextView` is part of RxAndroid and will create an Observable that will emit all the events you could alternatively fetch with a TextWatcher. e.g. it will emit the current password every time the user types a key.

`onBackpressureLatest` might seem the most confusing, but just go ahead and try to remove it. If you type _really_ long passwords, zxcvbn will take quite some time, even on good phones, and you will encounter a `MissingBackpressureException`. To prevent this from happening, we drop events that we can't handle and only pass the latest to zxcvbn when it is done processing the previous one. Backpressure is a difficult topic by itself, but in this case adding that operator is all that needs to be done.

{% highlight java %}
.observeOn(Schedulers.computation())
.map(zxcvbn::measure)
.observeOn(AndroidSchedulers.mainThread())
{% endhighlight %}

We switch threads to computation and back to the main thread, so that the UI remains responsive and does not lag.

  [dbzxcvbn]: https://github.com/dropbox/zxcvbn
  [dbzxcvbn4j]:https://github.com/nulab/zxcvbn4j

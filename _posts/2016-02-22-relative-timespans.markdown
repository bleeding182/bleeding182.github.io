---
layout: post
title:  "Relative Timespans"
categories: android
tags:
- time
- localization
published: true
excerpt_separator: <!--more-->
---
This is going to be a short post because I've seen a lot of custom implementations to provide the well known _a few minutes ago_ labels, which are often hard to maintain and rarely properly localized.

There already is an implementation for this&mdash;no, it's **not** JodaTime.

<!--more-->

## Enter DateUtils

For those of you eager to just read the documentation, you can find it [here](http://developer.android.com/reference/android/text/format/DateUtils.html). It provides an interface to display localized dates and timespans. There are many options to show or hide the year, display the weekday, or include the month by its name or number.

{% highlight java %}
DateUtils.getRelativeTimeSpanString(then, now, minResolution, flags);
{% endhighlight %}

Below is a screenshot from a simple app where you can check and uncheck the options with a simple preview. Check out the full source code [here](https://github.com/bleeding182/samples/tree/master/RelativeTimespan). The first line is `getRelativeDateTimeString()` and the second line shows `getRelativeTimeSpanString()`. You can also try the app yourself [here](https://play.google.com/store/apps/details?id=com.github.bleeding182.relativetimespan).

![Screenshot](https://raw.githubusercontent.com/bleeding182/samples/master/RelativeTimespan/screenshot.png)

The _only_ downside is, that you have no further control about the format of the returned string. Whether `am / pm` is displayed depends on the locale and user settings, which on the one hand is perfectly reasonable, on the other hand might lead to some discussions with your designer.

Another thing worth mentioning is that some strings can and will appear differently on various devices. While one might say _Yesterday_ another device could display _One day ago_. But I don't think that the developer should have to care about this&mdash;if every developer used `DateUtils` the user would still get a consistent experience within all of his apps.
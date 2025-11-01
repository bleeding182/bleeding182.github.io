---
layout: post
title:  "Settling in with Firebase Analytics"
categories: android
tags:
- firebase
- google-analytics
- tag-manager
published: true
excerpt_separator: <!--more-->
---
You might have heard: Firebase is the new thing. It is here, it is awesome, and I believe it will make all of our lives somewhat easier.

If you decide to switch to Firebase you will end up using analytics within your app. The default reports alone are worth the few steps it takes to set it all up. Tracking events has *never been easier* and I am hooked, although, to me, Firebase Analytics seems more like something that I want to use *in addition* to Google Analytics. While Firebase helps me to get my app up and running, Google Analytics still shares some valuable insights.

<!--more-->

## The new Google Analytics?

Google Analytics remains as powerful as it was, but you can't fail to notice the subtle hints of what Google wants you to use inside your apps since Firebase launched. So what's the difference?

Firebase Analytics seems to be all about events and grouping your users into audiences, which makes *a lot* of sense, since most&mdash;if not all&mdash;of the other Firebase products make really good use of those audiences. Do you want to send a message to all young males using your app? What if you decide to go for your regular or heavy users? Firebase with its analytics tool makes all of this possible. It is highly specialized with segmenting users by events and other characteristics, but this is also where I think it falls short.

If you want to do something like screen tracking&mdash;or real time data!&mdash; you will find yourself having a hard time. You could make different events for each screen, each item, and each button that you want to track, but this will most likely just clutter up your report. I don't see any gain in viewing a list of `clicked_a`, `clicked_b` because I believe this is what parameters are for.

There is no detailed report or *view* of your events and their values in Firebase Analytics like the ones that I got used to from using Google Analytics. You don't get your events listed and broken down by *categories*, *actions*, and *labels* anymore. Firebase just shows basic *events*, how often they occur, and&mdash;if applicable&mdash;their values. All those parameters that you can set, though, don't seem to appear anywhere within the Firebase Console.

Yes! You can group audiences by values of certain events, or you might work with funnels&hellip; There seems to be a bunch of options and, of course, there is also the option of exporting your data to Big Query. But I don't think this is the easy and quick option that most of us are after.

### Using both analytics tools&hellip;

So Firebase is awesome and you are including it into your app, but you still want your good old Google Analytics data. What you don't want is to include duplicate tracking code in your apps. And you most certainly don't want to specify your parameters used with Firebase once, just to start all over again grouping your events into categories and actions for Google Analytics. And maybe you have more than one platform to maintain&hellip; The good news is, that you don't have to do this!

As I already mentioned, *tracking events has never been easier*. This said, you should spend your time properly specifying and integrating Firebase Analytics with *their* events. Even though their parameters don't show up in your Firebase Console, they don't go to waste. To track to multiple platforms all you have to do is include Google Tag Manager in your project and Firebase *will* use it *automatically*. You get access to all events as a first class citizen and *there* is where you can hook up your Google Analytics reports.

Did I mention that tracking things *never has been easier*? Firebase with its *up to 25 parameters per event* in combination with Google Tag Manager allows for a really easy, platform independent implementation of your tracking. The only thing that you have to nail down is your Firebase tracking code.

If you started reading this post and assumed you were going to learn how to integrate Firebase Analytics, I'm sorry to disappoint you. The [Firebase documentation][1] is *really* good and guides you through how to track events. I want to tell you about tracking your events to your Google Analytics Properties with the help of Firebase.

## Google Tag Manager.

If you had a look at Tag Manager before, it was this weird thing, where you had to do some calls, refresh containers, and other not all too obvious stuff, but with Firebase you don't have to do any of that. Include the library and you're set. If you did not include Tag Manager before, you might have even seen the logcat output that Firebase did not find Google Tag Manager.

Firebase handles all the heavy lifting for you. After you include the Tag Manager SDK into your build all your tracking runs through your Tag Manager. If you do nothing it will just continue tracking to Firebase.

### What is Tag Manager?

As a short summary, think of Firebase Analytics as an event bus. If you log events and parameters you push them to the event bus, and Tag Manager is the subscriber. Depending on what you pushed you can define rules&mdash;called tags&mdash;about what to do with it. There are also options for adding, modifying, or blocking Firebase Events, which you can use to configure your Firebase Analytics tracking remotely. But the one thing I'm currently interested in is how to track screens to Google Analytics and get real time data.

### Your First Tag: Screen Tracking

In your Tag Manager Console open your container and click to add a new tag, either by selecting the option on the dashboard or the tag menu entry. The product to use is Google Analytics and after selecting it you will be prompted for your Tracking ID. Select the button to the right and choose to *create a new variable*. It is a good idea to have your Tracking ID as a constant value.

![New constant variable]({{ site.baseurl }}/assets/firebase-ga-tag-manager/fb_new_variable.png)

Since having screen views without the actual name of the screen does not make too much sense, we will have to include the name as well. Select *More Settings* - *Fields to Set* and add a new field. *screenName* is the value to use with Google Analytics, I'll explain the variable used next. I chose to name my tag Screen Tracking. Your setup should look something like this:

![Screen tracking setup]({{ site.baseurl }}/assets/firebase-ga-tag-manager/fb_screen_tracking_1.png)

{%raw%}`{{Item Name}}`{%endraw%} is another variable like the Tracking ID Constant created before. It makes use of the data layer where Firebase pushes its events. In my case I decided to use Firebase like this to track my home screen:

{% highlight java %}
Bundle bundle = new Bundle();
bundle.putString(FirebaseAnalytics.Param.ITEM_NAME, "home");
mFirebaseAnalytics.logEvent(FirebaseAnalytics.Event.VIEW_ITEM, bundle);
{% endhighlight %}

This will send a `view_item` event with a parameter `item_name` containing the screen name to Firebase. If you want to track different events and parameters you have to use those event and parameter names respectively. So to track my screens with the code shown above I'm going to use the keys `view_item` and `item_name`.

I create a new variable in Tag Manager, name it Item Name and select that it should have the value of `item_name`. With this I can access the parameter value and send the correct screen name to Google Analytics.

![Screen tracking setup]({{ site.baseurl }}/assets/firebase-ga-tag-manager/fb_variable_item_name.png)

As mentioned before, all that's left to finish our tracking is to set up a trigger. Triggers define *when* your tag fires. For the purpose of tracking your Firebase Events to Google Analytics as well you should choose a trigger that fires every time a specific event occurs.

Here I use `Event Name` which is a predefined variable to fire this tag every time a new `view_item` event gets pushed to the data layer.

![Screen tracking setup]({{ site.baseurl }}/assets/firebase-ga-tag-manager/fb_trigger.png)

With this trigger the setup is complete. Every time a `view_item` event occurs, Tag Manager will fire this tag. It will take the value out of `item_name` and send it as a screen view to Google Analytics.

![Screen tracking setup]({{ site.baseurl }}/assets/firebase-ga-tag-manager/fb_finished.png)

That's it! What you want to do now is publish your container, download it and add it to your project. If you did get something wrong, don't worry. You can just edit and publish a new version&mdash;Tag Manager will update itself within 24 hours. This is why all you really have to do is getting Firebase Analytics working. Google Analytics tracking can still be configured afterwards without changing any of your code.

## Summary

While the above *might* seem like a lot, it really isn't. And you don't even have to do it up front. Just try to nail down your Firebase Analytics tracking and once you want Google Analytics tracking you can always just include Tag Manager and get back your Real Time Data and Screen Views without modifying your source code at all.


  [1]:https://firebase.google.com/docs/analytics/
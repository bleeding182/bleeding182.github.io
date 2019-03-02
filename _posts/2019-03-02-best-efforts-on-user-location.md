---
layout: post
date: 2019-03-02 18:00
title:  "Best Efforts on User Location"
description: 
categories: android
tags:
- internationalization
- telephony-manager
published: true
excerpt_separator: <!--more-->
---

Where to do you move your map for a user that did not (yet) grant you the location permission? Can we guess the user's nationality or dial code, rather than make them go through a list of all 200 countries? Neither is especially bad when left unhandled, but this is also a great opportunity to improve user experience and make the app feel quicker and more responsive.

We can use `TelephonyManager` to fetch the country code of the user's SIM card, or even read the country (of the network) the user is currently in. While this is very basic information, there is a good chance that it is available&mdash;**without the need for any permissions or network calls**. While internationalization efforts in apps often include translations of the resources and layout adjustments for different content lengths or directions, here I'd like to explore some of the possibilities that this information opens up.

<!--more-->

By default we can access very little user data, which is good when arguing from a privacy protection point of view, but bad when we want to personalize their user experience. Some basic information readily available that we can get is the user's locale, but this only informs us about their culture and language.   
Android already uses this information to localize our app, but neither necessarily correlates with the user's current location or nationality. Minorities in other countries might still use their mother tongue on their phone, but even when users pick the "correct" language there is still a chance that they pick the "wrong" region for whatever reason&mdash;think of using your phone in British English, but living in the US.

The locale might be useful as a fallback (better than nothing?), but let's see how we can do better.

### Using the SIM Country Code

Let's start with `TelephonyManager.getSimCountryIso()` which will give us the country code (e.g. `us`, `at`, ...) of the equipped SIM card's provider. While this does not give us a good guess at the user's current location, it can be very useful when prompting our users for their phone number!

There is a high chance that a user will sign up with the number currently in use on their phone, so we can match the country returned to its corresponding phone country code. Android itself does not include a mapping for country to country code, but we could easily create a list of dialing codes on our own, or better yet use a sophisticated library like Google's [libphonenumber](https://github.com/googlei18n/libphonenumber) which adds even more features.

There are methods to fetch the user's whole phone number, like the Autofill framework (available since API 26) or Smart Lock, but we would still need some handling when those options come up empty. Using this method along with libphonenumber will give us the country code, which we can then use to prefill our form&mdash;always a nice touch!

{% highlight java %}
TelephonyManager systemService = (TelephonyManager) getSystemService(TELEPHONY_SERVICE);  
PhoneNumberUtil phoneNumberUtil = PhoneNumberUtil.getInstance();  
  
String simCountryIso = systemService.getSimCountryIso();  
int simCountryCode = phoneNumberUtil.getCountryCodeForRegion(simCountryIso.toUpperCase(Locale.US));  
  
int regionAT = phoneNumberUtil.getCountryCodeForRegion("AT"); // 43  
int regionUS = phoneNumberUtil.getCountryCodeForRegion("US"); // 1  
int regionCA = phoneNumberUtil.getCountryCodeForRegion("CA"); // 1
{% endhighlight %}

### Taking a Guess on the User's Location

Data is everything and especially the user's location can be quite useful in a wide variety of use cases. While an exact location is always better, we can often make do with a _good enough_ guess, which in this case would be the country. While this may seem somewhat broad, it can still be better to provide autocomplete results based on the current country rather than from the entire globe. Some users will choose not to grant any location permissions especially if it is for some minor feature. We can use `TelephonyManager.getNetworkCountryIso()` similarly to what we did before, but this time we will retrieve the country of the network currently in use rather than the country where the SIM card was issued.

So what can we do with this "country"? A few things come to mind:
* Travel apps can list information about the current country first. This could be the exact location a user wants, without the need for a location permission!
* Maps can be centered on the current country, rather than the [South Atlantic Ocean](https://www.google.at/maps/@0,0,15z) where the prime meridian meets the equator. This is especially useful to display while we don't have any permission (yet) or the location isn't available.
* Location based searches can be limited to the country, rather than the whole world. Rather than getting results from Canada, US, Britain, and Australia, it would already improve suggestions if we could narrow down our English query to a single country.

With those ideas in mind, the question remains: how can we get those bounds from the country code? Our best bet here is as well to include the list ourselves. There are a few sources online, e.g. [OpenStreetMap](https://nominatim.openstreetmap.org/search?q=at&format=json) will return bounds for countries&mdash;just make sure to read and adhere to the license!

### Conclusion

Reading the SIM or network country code from `TelephonyManager` enables us to optimize some of our user flows to get a _better_ result without any delay or permissions, but not necessarily the correct or _best_ one. There are other, more accurate options available, but they might not always be available to or enabled by our users. So even if it isn't perfect, we can use this information as a great default.

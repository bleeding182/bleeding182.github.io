---
layout: post
title:  "Testing your HTTP requests offline"
categories: android
tags:
- retrofit
- okhttp
- rxJava
- testing
published: true
excerpt_separator: <!--more-->
---

Most apps have to talk with servers in some ways and testing is not always easy. There are multiple steps involved to set up the test data, and sometimes a specific request can only be triggered once. Whatever the reason, often there is *some* work involved to test even the most basic things. So why not just cut out the server and provide your own data?

You might even get something like a demo or offline mode in the process.

<!--more-->

## Why bother?

Having local test data can greatly speed up things during development. Instead of registering, logging in, and setting up your account you could just directly launch to what matters to you most.  
Also, if you ever decide to run instrumentation tests you will always keep full control.

## What're my options?

While the most basic solution would be to just host some local web servers, there are indeed easier options available. If you use Retrofit with OkHttp mocking out your API calls is a piece of cake. *Why Retrofit?* Well...It turns your whole API into an interface&mdash;which you can just implement yourself.

We have 2 options to supply our own responses,

* provide the response as JSON / XML files to OkHttp
* return your own objects and maybe even simulate some behavior

While the second approach might sound better, there is more effort involved to implement and maintain it. So for now let's start with the first option.

### Provide your own responses

OkHttp has interceptors which let you modify or even completely hijack every request sent. Why not just return `"hello"` to every request?

{% highlight java %}
public class OfflineMockInterceptor implements Interceptor {

  private static final MediaType MEDIA_JSON = MediaType.parse("application/json");

  @Override
  public Response intercept(Chain chain) throws IOException {
    /** Will be called for every request you make.
        chain will include the request data, and you could
        just call chain.proceed() to continue with the HTTP request.

        We will return "hello", though. */

    Response response = new Response.Builder()
        /* Return "hello" to the api call */
        .body(ResponseBody.create(MEDIA_JSON, "\"hello\""))
        /* Additional methods to satisfy OkHttp */
        .request(chain.request())
        .protocol(Protocol.HTTP_2)
        .code(200)
        .build();

    return response;
  }
}
{% endhighlight %}


This is arguably a very simple example, but with some creativity you can make it more generic. Include your responses in your `debug/assets` folder and you could easily mock out multiple API calls by just reading those files.

{% highlight java %}
public class OfflineMockInterceptor implements Interceptor {

  private static final MediaType MEDIA_JSON = MediaType.parse("application/json");
  private Context mContext;

  public OfflineMockInterceptor(Context context) {
    mContext = context;
  }

  @Override
  public Response intercept(Chain chain) throws IOException {

    Request request = chain.request();

    /* http://sample.com/hello will return "/hello" */
    String path = request.url().encodedPath();

    /* I put a 'hello' file in debug/assets/mockData */
    InputStream stream = mContext.getAssets().open("mockData" + path);

    /* Just read the file. */
    String json = parseStream(stream);

    Response response = new Response.Builder()
        .body(ResponseBody.create(MEDIA_JSON, json))
        .request(chain.request())
        .protocol(Protocol.HTTP_2)
        .code(200)
        .build();

    return response;
  }

  private String parseStream(InputStream stream) throws IOException {
    StringBuilder builder = new StringBuilder();
    BufferedReader in = new BufferedReader(new InputStreamReader(stream, "UTF-8"));
    String line;
    while ((line = in.readLine()) != null) {
      builder.append(line);
    }
    in.close();
    return builder.toString();
  }
}
{% endhighlight %}

This is still the same principle, but this is now a complete implementation. Put your responses into the asset folder and it will return them for you.

{% highlight java %}
OkHttpClient client = new OkHttpClient.Builder()
    /* Don't forget to add the interceptor! */
    .addInterceptor(new OfflineMockInterceptor(this))
    .build();
{% endhighlight %}

## Using Retrofit...or rather *not* using it.

As mentioned before, Retrofit will create an API out of an interface&mdash;and because it is an interface you can just supply your own!

The best approach with this would be to have some `mock` or demo flavor.

{% highlight java %}
if(BuildConfig.FLAVOR.equals("mock")) {
  api = new MyMockImplementation();
} else {
  api = retrofit.create(Api.class);
}
{% endhighlight %}

Now is the time where I want to give you some advice: *Just use RxJava.*

If you don't want to, or feel afraid, take a minute and just try to implement a `Call<?>` object yourself. I wrote a mock once using Mockito and&mdash;believe me&mdash;not even mocking it is fun.

Even if you would succeed, you still need to provide a *callback*. You might want to add some delay...etc. Or you...*just use RxJava.*

Implementing the interface when using RxJava on the other hand could *just* look like this:

{% highlight java %}
public Single<String> getHello() {
  return Single.just("\"Hello\"");
}
{% endhighlight %}

While this might seem easier, in my experience it requires more maintenance than just dumping your server responses into the assets folder. But if you chose to mock your own API this way, you could even add some simple logic to actually simulate the server.

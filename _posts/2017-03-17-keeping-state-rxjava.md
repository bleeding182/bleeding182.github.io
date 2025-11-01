---
layout: post
title:  "Keeping State with RxJava using Loaders"
categories: android
tags:
- rxJava
- loaders
published: true
description: Keeping state with RxJava during orientation change with loaders.
excerpt_separator: <!--more-->
---

Keeping state on Android is always a little bit tricky and confusing. You either have to use some sort of singleton, store data in your Application object, or make use of the good old `onSaveInstanceState`. There is also always the option to use a service.

Saving instance state can't persist running operations like loading data. Using singletons or the application object to store data makes all of this possible, but global state is also something you should try to avoid unless really necessary. I will not go into detail about whether or not and how to use services, since this is a whole topic by itself.

I tend to use RxJava with Retrofit and a while ago I was wondering whether there was another way to keep state over configuration changes. Loaders came to my mind, which I do believe are well underused lately. And Loaders are supposed to handle long running tasks and keeping data, right?

<!--more-->

### Why Loaders?

Loaders are part of the Android Framework and I do not like to reinvent the wheel. Since Loaders are part of the framework they receive all those updates to the state of an Activity (or Fragment), I thought. It turns out there is no way to listen to state changes, but you will be notified when an activity is destroyed.

So as mentioned, we still have to manage the activity's lifecyle and unsubscribe when finishing, so I am going to use RxLifecycle for this. But if I am just going to use RxLifecycle anyways, what is to gain from using loaders?

Loaders will still enable me to kick off a task while changing the orientation, putting the app in the background, or taking a call. I can upload something and display the progress, or process some data, and with a loader I can continue exactly where I left off.

### What's the Goal?

Loaders, by definition, load data in the background and safely guard it during configuration changes. So to proof my concept I want some long running operation that will deliver a result. Once I have the result, I want to keep it and skip the loading in the future (after orientation changes).

This is what I came up with and as you can see I have some (fake) long running task, and I will just wait and log the result. And to prevent memory leaks with ease I use `RxLifecycle`. Here is how I imagine using my newly created loader... Let's call it RxLoader.

{% highlight java %}
@Override
protected void onCreate(@Nullable Bundle savedInstanceState) {
  super.onCreate(savedInstanceState);

  Observable<String> longRunningObservable = Observable.just("Hello Loader")
      .delay(5, TimeUnit.SECONDS);

  RxLoader.create(this, 13, longRunningObservable)
      .compose(bindToLifecycle())
      .subscribe(
          text -> Log.d("LoaderActivity", text),
          e -> Log.e("LoaderActivity", "Error", e),
          () -> Log.d("LoaderActivity", "Completed")
      );
}
{% endhighlight %}

If you have a look at this, we just create the activity. Then we could rotate the screen a few times, and&mdash;hopefully&mdash;after 5 seconds we will have our result. If I keep rotating I do expect the result to be there immediately&mdash;duh.

### Implementing the Loader

By passing in the Activity, a loader ID, and the Observable source, I can go ahead and register a Loader by calling `initLoader` with a simple callback that will just create my RxLoader.

{% highlight java %}
public class RxLoader<T> extends Loader<T> {
  private final Observable<T> observable;
  private final BehaviorSubject<T> cache = BehaviorSubject.create();

  private Subscription subscription;

  private RxLoader(Context context, Observable<T> observable) {
    super(context);
    this.observable = observable;
  }

  public static <T> Observable<T> create(AppCompatActivity activity, int id,
                                         Observable<T> observable) {
    LoaderManager loaderManager = activity.getSupportLoaderManager();

    CreateLoaderCallback<T> createLoaderCallback =
        new CreateLoaderCallback<>(activity, observable);
    loaderManager.initLoader(id, null, createLoaderCallback);

    RxLoader<T> rxLoader = (RxLoader<T>) loaderManager.getLoader(id);
    return rxLoader.cache.asObservable();
  }

  // ...

  private static class CreateLoaderCallback<T>
      implements LoaderManager.LoaderCallbacks<T> {

    private final Context context;
    private final Observable<T> observable;

    public CreateLoaderCallback(Context context, Observable<T> observable) {
      this.context = context;
      this.observable = observable;
    }

    @Override
    public Loader<T> onCreateLoader(int id, Bundle args) {
      return new RxLoader<>(context, observable);
    }

    // ...

  }
}
{% endhighlight %}

The Loader itself will just subscribe to the Observable and keep the result in the BehaviorSubject until it is reset, when it will unsubscribe from the Observable to ensure that no memory gets leaked.

We then call `loaderManager.getLoader(id)` to fetch the&mdash;possibly already finished&mdash;loader and return the cache for our observers to subscribe to.

The implementation of the loader itself is pretty straightforward, as I do not include any error handling for this sample. We subscribe and keep the subscription. Upon reset we unsubscribe. The result gets passed to `cache`.

{% highlight java %}
  // ...

  private final BehaviorSubject<T> cache = BehaviorSubject.create();

  private Subscription subscription;

  // ...

  @Override
  protected void onStartLoading() {
    super.onStartLoading();
    subscription = observable.subscribe(cache::onNext);
  }

  @Override
  protected void onReset() {
    super.onReset();
    subscription.unsubscribe();
  }
{% endhighlight %}


By running this code, I can now start a long running task and keep changing configurations. The result will be available after 5 seconds and rotating the device afterwards will immediately receive the result.

### Why not make use of _compose_?

Indeed! If you have had a look at RxJava before you might have come across compose and lift. With the current implementation of RxLoader we take an observable, and return an observable&mdash;this sounds a lot like compose. Let's see if we can modify the code.

Switching the static builder to use compose is fairly easy:

{% highlight java %}
Observable.just("Hello Loader")
    .delay(5, TimeUnit.SECONDS)
    .compose(RxLoader.compose(this, 13))
    .compose(bindToLifecycle())
    .subscribe(
        text -> Log.d("LoaderActivity", text),
        e -> Log.e("LoaderActivity", "Error", e),
        () -> Log.d("LoaderActivity", "Completed")
    );
{% endhighlight %}

Creating a Transformer is just as easy&mdash;we already did all the hard work!

{% highlight java %}
public static <T> Observable.Transformer<T, T> compose(AppCompatActivity activity,
                                                       int id) {
  return observable -> create(activity, id, observable);
}
{% endhighlight %}

With this we can now either use a static method to create our Observable, or we can just include it in our stream, which will give us better readability.

Naming things is hard, and while I'm not happy with RxLoader, it is the best I can come up with at the moment of writing this, and I'm open to suggestions :)

### Summary

I do not know how usable this approach is in the long run. I was curious, and tried it, and maybe it's some good food for thought. I do believe it is simple enough to just wrap it into your Observable chain when you're too lazy to set up a service or just don't need to. I'd be interested in knowing what you think.

#### The Complete Class

The complete code for this sample, including the callback for easier reading:

{% highlight java %}
public class RxLoader<T> extends Loader<T> {
  private final Observable<T> observable;
  private final BehaviorSubject<T> cache = BehaviorSubject.create();

  private Subscription subscription;

  private RxLoader(Context context, Observable<T> observable) {
    super(context);
    this.observable = observable;
  }

  public static <T> Observable.Transformer<T, T> compose(AppCompatActivity activity,
                                                         int id) {
    return observable -> create(activity, id, observable);
  }


  public static <T> Observable<T> create(AppCompatActivity activity, int id,
                                         Observable<T> observable) {
    LoaderManager loaderManager = activity.getSupportLoaderManager();

    CreateLoaderCallback<T> createLoaderCallback =
        new CreateLoaderCallback<>(activity, observable);
    loaderManager.initLoader(id, null, createLoaderCallback);

    RxLoader<T> rxLoader = (RxLoader<T>) loaderManager.getLoader(id);
    return rxLoader.cache.asObservable();
  }

  @Override
  protected void onStartLoading() {
    super.onStartLoading();
    subscription = observable.subscribe(cache::onNext);
  }

  @Override
  protected void onReset() {
    super.onReset();
    subscription.unsubscribe();
  }

  private static class CreateLoaderCallback<T>
      implements LoaderManager.LoaderCallbacks<T> {

    private final Context context;
    private final Observable<T> observable;

    public CreateLoaderCallback(Context context, Observable<T> observable) {
      this.context = context;
      this.observable = observable;
    }

    @Override
    public Loader<T> onCreateLoader(int id, Bundle args) {
      return new RxLoader<>(context, observable);
    }

    @Override
    public void onLoadFinished(Loader<T> loader, T data) { /* nothing */ }

    @Override
    public void onLoaderReset(Loader<T> loader) { /* nothing */ }
  }
}
{% endhighlight %}

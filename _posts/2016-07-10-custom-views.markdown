---
layout: post
title:  "Basics for views and how to create your own"
categories: android
tags:
- view
published: true
excerpt_separator: <!--more-->
---

What is a view? Why would I create my own? and...how does it work?

If you don't know whether you need a custom view or not, you probably don't. Most UI elements can be easily expressed using the elements of the Android framework, the support library, or the Google design library.

If you still did not find what you were looking for try GitHub first. Especially for Android there are thousands of libraries, some of them might do what you want. And now that you still didn't find anything that you can or want to use, because your usecase is very special in some way...*Now* I have to admit: You probably need a custom view.

<!--more-->

## Custom view or layout

First things first: A layout&mdash;or `ViewGroup`&mdash;is also a view, but this article is just to cover the basics of creating your first view and understanding how.

A `View` in Android is everything. From the status bar on top, over to your app's layout, to the navigation bar on some device's bottom. Even running some Unity app on Android will wrap the game within an activity and the output is shown in a view. So if you did not know how views worked up until now, I'd say now's the day this changes.

The following is about how your view gets from code to screen. Handling touch events, scrolling, and many other features are out of scope for now.

## Measure. Layout. Draw.

This is how views interact with the rest of the Android system. The `onMeasure`, `onLayout`, and `onDraw` callbacks will be invoked to notify your view of some change. Changing some layout for example will trigger a new layout pass on all child elements before the view redraws.

Those methods will always be called in the same order. If your view's dimensions change it will be measured and layouted before being drawn again.

### Measuring

Measuring is the first part of layouting and drawing a view. It is used to determine the size the view *wants* to have. If you don't have any special requirements, you can just use the base implementation of `View`, which will handle most cases properly.



{%highlight java%}
@Override
protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
    super.onMeasure(widthMeasureSpec, heightMeasureSpec);
}
{%endhighlight%}

The `measureSpec` parameters passed to the view by the enclosing layout include the information about the available size, but beware: *They are not just some value that you can use.* The integer value passed to your view contains bit flags and to access the actual values you have to make use of `MeasureSpec`, which you also utilize to create a new measure spec.

{%highlight java%}
int size = MeasureSpec.getSize(measureSpec);
int mode = MeasureSpec.getMode(measureSpec);
{%endhighlight%}

This `size` is the available width or height to the view. To make sense of that value, there is also the `mode` which describes how to interpret it:

**`MeasureSpec.UNSPECIFIED`** Do what you want. Be as big as you'd like. E.g. in a `ScrollView` the view can be as big as it likes. Take care, though, `size` might be `0` in this case.

**`MeasureSpec.AT_MOST`** Most layouts will pass this in. If your `FrameLayout` is 500px wide, then it would not make sense for your view to be bigger than this.

**`MeasureSpec.EXACTLY`** This one is fun. Don't think about it. The layout says thou shalt be 500px and this is what you should do.

You might have noticed that I am using pixels here and you might wonder *Hey, dude, you should use `dp`!* Drawing and measuring and layouting all use pixels. The `dp` values are not ignored, though. They were already taken into account to create the `size`.

If you have some special requirements, e.g. if your view should always be square, then you'd also do this while measuring. If you have `AT_MOST` 300x400px available, you can either call `setMeasuredDimension` yourself after calculating your sizes or create your own `MeasureSpec` and again leave it to your base implementation to handle the rest. The most work will be properly reading those 3 cases and calculating your size accordingly, as `AT_MOST 300 width` x `EXACTLY 400 height` will be some edge case to consider. If you don't write a reusable library such edge cases can often be ignored, though.

### Layouting

This method gets called *a lot*. Here is where you are told how big you actually are and where you can initialize your variables, e.g. if you display a picture in the center of your view *this is where you might calculate the center*. If you do drawing, rewind and setup your `Path`. Do *not* allocate objects if you can avoid it, though. Android Studio also offers a Lint check that will highlight any `new` calls.

Bear in mind that the width and height your view receives in `onLayout` is not necessarily the width and height from `onMeasure`. It's up to the layout how to handle your view and how much size to assign.

{%highlight java%}
@Override
protected void onLayout(boolean changed, int left, int top,
        int right, int bottom) {
    super.onLayout(changed, left, top, right, bottom);

    // init your stuff here
    mPath.rewind();
    mPath.moveTo(left, top);
    mPath.lineTo(right,bottom);
}
{%endhighlight%}

These are the bounds you *will* have when drawing. If they change, `onLayout` will be called before the next drawing, so any calculation that is even slightly more complicated is better fitted here, than in `onDraw`, because you want your `onDraw` to be as sleek as possible.

### Drawing


This one should be simple enough: Just draw yourself to the `Canvas`.

{%highlight java%}
@Override
protected void onDraw(Canvas canvas) {
    super.onDraw(canvas);
    canvas.drawPath(mPath, mPaint);
}
{%endhighlight%}

Remember *not* to allocate anything here. Calling `new` in `onDraw` is **bad bad bad**. If you want your 60 FPS this method might get called 60 times per second.

## Now what?

These were but the basics and what you do with it is up to you. There are lots of examples of what views can do&mdash;just have a look at the Android framework! Buttons, images, date pickers, and many more.

Many others walked this path before and GitHub offers a lot of examples where people create their own views. Sneak a peek before including and using their library next time and see how they do it.




[customLayouts]:{% post_url 2016-07-10-custom-views %}
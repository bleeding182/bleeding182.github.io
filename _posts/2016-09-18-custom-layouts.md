---
layout: post
title:  "Create custom layouts"
categories: android
tags:
- view
published: true
excerpt_separator: <!--more-->
---

More often than not you will find yourself in a position where you need some...custom behavior. Whether you want a view to keep a 16:9 aspect ratio, or want a view to scroll&mdash;and still fill the screen.

Don't be afraid to create and use your own layouts. Not only will they have great reusability, they will save you time and ease your life. If you start repeating the same pattern in your layout files...maybe you should just create a custom View. Your layout will stay clean and simple while you have better maintainability when something changes.

Most important of all: If you like using `ViewTreeObserver` to adjust your layouts drop everything _right now_. This post is for you.

<!--more-->

## What about ViewTreeObserver?

As the name suggests you will observe layout changes and _react_ to those changes thus triggering yet another layout pass instead of just declaring how big you wanted your view to be in the first place. In my opinion there are little use cases where the usage of `ViewTreeObserver` is acceptable (e.g. for animating some background image that depends on some heights) but I would like to claim this is not what it is used for most of the times. Avoid the unnecessary layout passes which could also impact your performance and do your layouting where it belongs.

If you have some dynamic sizes you should go and take part in the layout process yourself. Keep your code clean and maybe create something reusable in the process.

## A square ImageView

I know I said "layouts", but I want to start with an easy example. The goal is to have a square `ImageView` where `height == width`. The height can not just be determined before, since the drawable can scale, doesn't have a 1:1 aspect ratio, or you use some custom drawable that takes the views dimensions.

While this requirement may seem abstract, I just recently had this exact use case, where I wanted to have draw a circle in the background with a scalable graphic above. This along with a more complex layout and keeping things _squary_ or _circly_ was not that simple any more.

I hope you did think along and had some thought about how you would take this on. Constraining a view to be square should be easy enough and as mentioned earlier you _could_ use a `ViewTreeObserver`. _Please_ don't.

### Square the View

Since we simply extend `ImageView` you should stick to using `ImageView` in your code. Let the `ImageView` do the heavy lifting and just add the contraint for the height. Omitting the constructors, the task is simple enough and this is literally all of the code you need.
{%highlight java%}
@Override
protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
    int width = MeasureSpec.getSize(widthMeasureSpec);
    int measureSpec = MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY);
    super.onMeasure(measureSpec, measureSpec);
}
{%endhighlight%}

If you don't know about measuring, this is where a view's size is determined. The `MeasureSpec` contains the suggested or available height. By calling `setMeasuredDimension(with, height)` the view defines its size, but in this case this is handled by the super.

## Custom layouts

The sample above could also have been solved using a custom layout which would only assign equal width and height values to the view in the first place, but this approach&mdash;while still valid&mdash;would not be very reusable by itself unless you have more specific constraints. And there are probably a bunch of other solutions to this problem, you should just try to get the right tool for the job.

Next I want to create a layout where there is a full screen View that has additional content below the fold. Just check the image for an idea of what I'm talking about.

![]({{ site.baseurl }}/assets/custom-layout/custom_view_fullscreen_sample_image.png)

The problem here is that the height of the top view will vary with every device. And maybe you have additional constraints. The basic approach would be done by putting a `LinearLayout` inside a `ScrollView`. The only further problem would be _how_ to size the top view to be _screen filling_.

Again, _please_ don't use a `ViewTreeObserver`. Yes, it will work, but it is not pretty. And it probably does not perform well either.

### Creating the layout&mdash;A first approach

Since creating a complete custom layout is a little bit more complicated, I just want to extend `LinearLayout`. I basically need its behavior, but I just want to add my constraints on the first view.

{%highlight java%}
public class FullScreenLinearLayout extends LinearLayout {

    /* Constructors */

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        if (getChildCount() > 0) {
            View view = getChildAt(0);
            view.getLayoutParams().height = getMeasuredHeight();
        }
        super.onMeasure(widthMeasureSpec, heightMeasureSpec);
    }
}
{%endhighlight%}

While admittedly this is a little bit dirty, go ahead and try it. It will work. We got the expected behavior and there is no `ViewTreeObserver` involved. We apply the height _during_ the layout process and are not wasting any resources. I don't like this solution, because `getMeasuredHeight()` does not seem too good to me. So let's go one step further and create our own `ViewGroup`.

### Creating a custom layout
We have just been subclassing the `LinearLayout` and were hoping for it to work. This might break or introduce bugs, since&mdash;let's face it&mdash;the `LinearLayout` has a couple of nice features with which we might conflict.

Measuring and layouting views is in fact a lot easier than it may sound, so I want to show one other solution to this same problem. For simplicity reasons I will only support 2 views. Adding loops to have an arbitrary amount of children in this case would just complicate things. The goal was to have one full screen view with another below the fold which is exactly what we will do now.

{%highlight java%}
@Override
protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
  View fullscreenView = getChildAt(0);
  View bottomView = getChildAt(1);

  // first child should fill
  int availableHeight = MeasureSpec.getSize(heightMeasureSpec);
  int fullHeightMeasureSpec = makeMeasureSpec(availableHeight,
      MeasureSpec.EXACTLY);
  fullscreenView.measure(widthMeasureSpec, fullHeightMeasureSpec);

  // second view can be as big as it wants
  LayoutParams layoutParams = bottomView.getLayoutParams();
  int childHeightMeasureSpec = getChildMeasureSpec(heightMeasureSpec,
      0, layoutParams.height);
  bottomView.measure(widthMeasureSpec, childHeightMeasureSpec);

  // sum the height
  int maximumWidth = Math.max(fullscreenView.getMeasuredWidth(),
      bottomView.getMeasuredWidth());
  int totalHeight = fullscreenView.getMeasuredHeight()
      + bottomView.getMeasuredHeight();

  // determine our own height
  setMeasuredDimension(maximumWidth, totalHeight);
}
{%endhighlight%}

We use `MeasureSpec` to read and create the necessary layout constraints. While this might seem overwhelming I have to say, once you start creating custom layouts you will get used to this very quickly, just remember the 3 different kinds of layout sizes.

* `AT_MOST` not bigger than
* `EXACTLY` you determine the size
* `UNSPECIFIED` ...do what you want

When layouting views you can assign them sizes or let them choose their own. When you feel curious, you can always look at the code from the Android framework and have a look at how they decided to handle things.

The code above deals with 2 views and they now have measured dimensions. All that remains to do is layouting them within out `ViewGroup`. Since this is a simple example we just draw the first view to the top and the second one below.

{%highlight java%}
@Override
protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
  View fullscreenView = getChildAt(0);
  View bottomView = getChildAt(1);

  int fullscreenHeight = fullscreenView.getMeasuredHeight();
  int foldPosition = top + fullscreenHeight;

  // position the fullscreen view on top, the other one below
  fullscreenView.layout(left, top, right, foldPosition);
  bottomView.layout(left, foldPosition,
      right, foldPosition + bottomView.getMeasuredHeight());
}
{%endhighlight%}

That's it! Of course there is still a lot of room for improvement, but we just created our own `ViewGroup` that takes care of measuring and layouting its views. Once you get started creating your own views, you'll quickly start reaping the benefits. You will be much quicker with some special use cases and you could even gain the little extra performance you might need.

## Final words

Some things you should always keep in mind are the framework methods which can help you _a lot_. In the code above I made use of `getChildMeasureSpec()` because I did not want to check for the different values myself. The child could have a fixed height, match the parent, or wrap its content, but this method will just take care of all those cases.

There are more, and if you are a little bit like me you will discover them bit by bit with some amazement and add them to your personal toolkit.

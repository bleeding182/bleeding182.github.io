---
layout: post
title:  "Custom Drawables and Animations"
categories: android
tags:
- drawable
- animation
published: true
---
There are many opportunities where the usage of a custom drawable will lead to nice, clean, and reusable results. If you need to display changing text inside an icon or introduce a custom progress indicator like in [Modifying the resource image of Progress Bar][1] on Stack Overflow, you can easily do so with custom drawables.

With this guide I want to point out what's necessary to set up, draw, and animate drawables with little effort. This is a basic sample, so please take the code and modify it to your needs! A compilable project with the full source code is available at [GitHub][3].

So this is what we are trying to accomplish within the next few steps: a simple star that spins when clicked. The sample sets the menu icon in a `Toolbar`. This is to point out another good use case for custom drawables, where you could instead display an unread count or coin balance in your menu!

![Spinning Star](https://raw.githubusercontent.com/bleeding182/samples/master/SpinningStar/anticipateOvershoot.gif)

## Why custom drawables?

Power. With custom drawables you get a canvas and can let your creativity flow. By understanding the basics of how to draw text and shapes on your canvas you can achieve almost anything. There are alternatives to using custom drawables that require less effort like `animation-list` drawables, but you will need a separate image for each frame greatly increasing your app size and you can not interpolate in-between the single pictures.

By drawing circles and arcs yourself you can use [Interpolators][2] to improve readability and reusability as they provide a simple interface to apply minor tweaks to your animation. e.g. Interpolators will smooth out the acceleration, leading to a more natural look and feel. In the image above an `AnticipateOvershootInterpolator` was used, with which the animation will start and end in the opposite direction.

## Basics: Coordinates & Bounds
So far it seems most people struggle with basic drawing. Take some pen and paper and start scratching out what you are trying to accomplish. Possible paddings, margins, and other things you need to consider will be much easier to grasp. Adding this knowledge to the comments will also help to greatly improve the readability of your code, since drawing operations are always hard to follow.

First things first: the top left is at [0,0]. Although, this may not be where you are expected to draw. Every drawable has bounds which specify its position and dimension on the canvas. `getBounds()` tells you where to position and draw your drawable, without unwanted side effects.

Using bounds will make things such as adding an additional padding or offset easy since you can just apply transformations to your bounds. With this in mind, the top left of your drawable then changes to `[bounds.left, bounds.top]` which may seem somewhat irritating at first, but will greatly simplify things with more complex drawing. These bounds also provide you `width()` and `height()` which you will need fairly often. 

Don't forget to make a copy of your bounds before modifying them. e.g. Applying an inset or offset to your bounds will lead to different results for each drawing operation.

{% highlight java %}
Rect bounds = new Rect();
bounds.set(getBounds());
bounds.inset(10, 10); // apply padding

// draw within your bounds, e.g.
canvas.drawRect(bounds, mPaint);
{% endhighlight %}

## Performance
Above all, keep in mind that, even if there are no lint checks (yet?), running animations will call your `draw()` method *every 16ms*. This means: **Do as little as possible while actually drawing.**

If you have paths or complex arrangements that you can compute beforehand you should do so. By overriding `setBounds(int, int, int, int)` and calling an `init()` method you have a great hook to update your values whenever the bounds change.  
This init method will also be used in the sample below to keep the drawing method clean and simple.

{% highlight java %}
@Override
public void setBounds(int left, int top, int right, int bottom) {
    super.setBounds(left, top, right, bottom);
    init();
}
{% endhighlight %}

## Measuring your drawables

*Usually* `getBounds()` will return your intended size. There should not be too many situations where you need to think about setting your height and width yourself and you *should not* draw with a fixed pixel size. But in case that you absolutely need to, overriding `getIntrinsicHeight()`  and `getIntrinsicWidth()` will account for just that. Here you can specify the height and width you wish to be, but doing so might still lead to different values for your bounds.

### MenuItem icons
The aforementioned is also needed if you want to set your custom drawable as an icon for a `MenuItem`. Reading the android source code, it seems that your drawable will always receive `min(intrinsincHeight, menuIconMaxHeight)`, which will by default set your bounds to `(width:-1, height:-1)` if you don't override `intrinsicHeight` yourself.

This is a bug, since there is no further possibility to get the actual size and position for your drawable. The canvas will have arbitrary bounds and your drawing will be offset and cut off. To fix this you can make use of the `min` clause and just return a large number for your intrinsic height. You then will get correct bounds.

{% highlight java %}
@Override
public int getIntrinsicHeight() {
    return 500;
}
{% endhighlight %}

The only problem with this solution is that it reduces the reusability of your code. By requesting a fixed height using your drawable as a background or in an `ImageView` will squeeze or stretch your drawing instead of letting you account for the different sizes yourself.

## Example: Calculate a path for a hexagram
As mentioned before, the calculation for your path should always be the same and hence should be  performed only once, and if possible outside of the `draw` method. The following sample uses some basic trigonometry to calculate the positions of a triangle within a circle and basically just sets those 2 triangles on top of each other, leading to a hexagram or star like figure.

How to calculate paths and or use trigonometry is not part of this article. I just will mention again, take some pen and paper to sketch out the bounds and alignments of your objects, as this will make things easier to grasp and implement.

{% highlight java %}
private void init() {
    mPath = new Path();
    Rect bounds = new Rect();
    bounds.set(getBounds());
    bounds.inset(10, 10); // apply some padding

    final int x = 3;
    final float angle = 360 / x;
    final double rads = Math.toRadians(angle);

    float exactCenterX = bounds.exactCenterX();
    float exactCenterY = bounds.exactCenterY();
    float widthOffset = (float) ((bounds.width() / 2) * Math.sin(rads));
    float heightOffset = (float) ((bounds.height() / 2) * Math.cos(rads));

    // move to the first point
    mPath.moveTo(exactCenterX - widthOffset, exactCenterY - heightOffset);
    for (int i = 2; i <= x; i++) {
        // draw the other 2 points
        mPath.lineTo((float) (exactCenterX - ((bounds.width() / 2) * Math.sin(rads * i))),
                (float) (exactCenterY - ((bounds.height() / 2) * Math.cos(rads * i))));
    }

    mPath.moveTo(exactCenterX + widthOffset, exactCenterY + heightOffset);
    for (int i = 2; i <= x; i++) {
        mPath.lineTo((float) (exactCenterX + ((bounds.width() / 2) * Math.sin(rads * i))),
                (float) (exactCenterY + ((bounds.height() / 2) * Math.cos(rads * i))));
    }
}
{% endhighlight %}



## Draw

Given that we already set everything up in `init()`, the drawing operation itself should be simple enough. If you have multiple objects you would add modifications to your paint object (e.g. color, alpha) and just draw your objects one after the other.

{% highlight java %}
@Override
public void draw(Canvas canvas) {
    canvas.drawPath(mPath, mPaint);
}
{% endhighlight %}

##Animating the star
In this sample I want to show how to spin the star, but so far it is just statically drawn on the canvas.  To support animations the drawable has to implement `Animatable`. For reasons of simplicity this sample drawable will also implement `Runnable` which you could supply as a separate object.

Animations always have to do with time, so this is where we start:

{% highlight java %}
private static final long FRAME_DELAY = 1000 / 60; // 60 fps
private boolean mRunning = false;
private long mStartTime;
private int mDuration = 250; // in ms
{% endhighlight %}

`FRAME_DELAY` is a constant used to supply 60 fps or 16ms and is mostly used for readability. `mRunning` will keep track of the drawables' state, while `mStartTime` is used to calculate the animation progress. `mDuration` determines the length of the complete animation in ms. This will usually be a value between 250 and 1000.

### Start, stop, and run
Start and stop schedule a `Runnable` to be run. They also keep track of the state, so that only one animations runs at once. Start will set `mStartTime` and start scheduling the runnable, possibly stopping an already running animation.

`invalidateSelf()` will cause a request for the drawable to be redrawn. This will lead to a call to `draw()` on the drawing pass.

{% highlight java %}
@Override
public void start() {
    if (isRunning()) {
        stop();
    }
    mRunning = true;
    mStartTime = SystemClock.uptimeMillis();
    invalidateSelf();
    scheduleSelf(this, mStartTime + FRAME_DELAY);
}

@Override
public void stop() {
    unscheduleSelf(this);
    mRunning = false;
}
{% endhighlight %}

The main work lies within the `Runnable` implementation: Check if the animation is finished or schedule the drawable again. By not rescheduling itself you remove the need of calling `unscheduleSelf()`. To support indeterminate drawable animation you could simply call `start()` when the animation finished to just start all over again.

{% highlight java %}
@Override
public void run() {
    invalidateSelf();
    long uptimeMillis = SystemClock.uptimeMillis();
    if (uptimeMillis + FRAME_DELAY < mStartTime + mDuration) {
        scheduleSelf(this, uptimeMillis + FRAME_DELAY);
    } else {
        mRunning = false;
    }
}
{% endhighlight %}

### Animating the drawable

The real animation of course takes place in `draw()` where we need to account for the progress and rotate the star accordingly.  
In this sample we will just rotate the canvas, since this eliminated the need to recalculate the path every 16ms. We can reuse the same path and even stretch, shrink, or move the star by just manipulating the canvas.

The progress should be within [0,1] and to do so we just take `elapsed / total`. The interpolator helps to smooth out the look of the animation and make it feel more natural. For values between 0 and 1 the output of the interpolator again is within [0,1]. You can read a bit more on interpolators in the next section.

{% highlight java %}
@Override
public void draw(Canvas canvas) {
    final Rect bounds = getBounds();

    if (isRunning()) {
        final float elapsed = SystemClock.uptimeMillis() - mStartTime;
        final float rawProgress = elapsed / (float) mDuration;
        final float progress = mInterpolator.getInterpolation(rawProgress);
        final int save = canvas.save();
        
        // rotate the canvas by progress
        canvas.rotate(progress * 360, bounds.exactCenterX(), bounds.exactCenterY());
        
        // draw the star
        canvas.drawPath(mPath, mPaint);

        canvas.restoreToCount(save);
    } else {
        canvas.drawPath(mPath, mPaint);
    }
}
{% endhighlight %}


## Interpolators

In the above sample we already used an [`Interpolator`][2]. They help to apply some further enhancements to a linear interval, letting us easily tweak some simple animations. e.g. Using an `AccelerateDecelerateInterpolator` would gradually speed up at the beginning of the animation and slow down at the end.

Using interpolators like the `AnticipateInterpolator` will start with the star spinning into the opposite direction before accelerating in the right direction. Using these interpolators greatly simplifies more natural looking animations and helps to improve reusability and to support little modifications.

## Source
The source code is available at [GitHub][3] within a runnable project.

Thanks to Nick Liu for proof reading.

[1]:http://stackoverflow.com/q/34536075/1837367
[2]:http://developer.android.com/reference/android/view/animation/BaseInterpolator.html
[3]:https://github.com/bleeding182/samples/tree/master/SpinningStar
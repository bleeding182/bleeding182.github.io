---
layout: post
title:  "Animations and Decorations"
categories: android
tags:
- recyclerView
- itemDecoration
- animation
published: true
---
Just a quick update to my [last post]({% post_url 2015-11-10-recyclerview-with-decorations-basic-guide %}) on a little thing I missed out: Animations.

Since a recyclerView supports animations by default as soon as you give your items a stable id with `setHasStableIds(true)` and by implementing `getItemId(int)`, it should be worth spending a minute or two in basic handling of those pesky things.


## The current problem

What's happening in a lot of places is that animations are being ignored. An example for those using _WhatsApp_, it will not animate the separator when archiving a conversation.

![Broken animation]({{ site.baseurl }}/assets/decorations-animations/broken.gif)

So how would we fix it? Easy.
{% highlight java %}
// all the magic here
child.getTranslationX()
{% endhighlight %}


## onDraw

What we want to do is update the drawing to account for the ongoing translation of the view. If the view moves, so do we.
{% highlight java %}
// update from
c.drawLine(view.getLeft(),
        view.getBottom() + offset,
        view.getRight(),
        view.getBottom() + offset,
        mPaint);

// to
c.drawLine(view.getLeft() + view.getTranslationX(),
        view.getBottom() + offset + view.getTranslationY(),
        view.getRight() + view.getTranslationX(),
        view.getBottom() + offset + view.getTranslationY(),
        mPaint);

// and you're done :D
{% endhighlight %}

But beware.

This is for **basic** animations. This won’t make your decoration spin or zoom in and out, but if you were drawing a background… it will now be dismissed along with the decorated view!

![Still missing alpha]({{ site.baseurl }}/assets/decorations-animations/better.gif)

## The icing on the cake

If you look ever so closely you might notice the separators suddenly appear—even overlap with another view! Well, you guessed it. Since the view is fading in, we could and should also account for that.

Be sure to store the original alpha value of your color and it's a piece of cake.
{% highlight java %}
// store original alpha value when initializing the color
mPaint.setColor(color);
mAlpha = mPaint.getAlpha();

// ...

// ...

// in onDraw() set the alpha
for (int i = 0; i < parent.getChildCount(); i++) {
  // get the view
  final View view = parent.getChildAt(i);

  // apply alpha
  mPaint.setAlpha((int) (view.getAlpha() * mAlpha));
  // do draw :)
  c.drawLine(view.getLeft() + mMarginLeft + view.getTranslationX(),
      view.getBottom() + offset + view.getTranslationY(),
      view.getRight() - mMarginRight + view.getTranslationX(),
      view.getBottom() + offset + view.getTranslationY(),
      mPaint);
}
{% endhighlight %}

Now we got us a nice and smooth animation moving along with the view! :D

![Proper animation]({{ site.baseurl }}/assets/decorations-animations/proper.gif)

Next up… I guess another one on animations to conclude the series :p

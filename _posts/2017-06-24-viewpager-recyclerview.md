---
layout: post
title:  "Paging your RecyclerView"
categories: android
tags:
- recyclerView
- itemDecoration
- pagerIndicator
- viewPager
published: true
excerpt_separator: <!--more-->
---

Everyone knows how to display multiple pages using a `ViewPager`, but since support library version 24.2.0 came out this is no longer the only way. With `SnapHelper` you can easily add a pager-like feel to your RecyclerView and maybe even make your life easier in the process. This post is about how to setup your RecyclerView along with those page indicators that everyone loves. If you read some of my blog, you might already know what's coming next:

_More about ItemDecorations!_ :D

![ViewPagerDecoration]({{ site.baseurl }}/assets/viewpager-recyclerview/viewpagerdecoration.gif)

<!--more-->

### Pager Setup

First things first. The setup for your RecyclerView is as easy as it gets. Just make sure that the item layouts have `layout_width="match_parent"` or you will have a hard job "paging" your items. Your RecyclerView should either have a fixed height&mdash;`match_parent` is also valid&mdash;or `wrap_content` if you can ensure that all your items have the same height.

Just add a `PagerSnapHelper` to your RecyclerView and you're ready.

{% highlight java %}
// add a background color to the recyclerview
recyclerView.setBackgroundColor(backgroundColor);

MyAdapter adapter = ...

recyclerView.setAdapter(adapter);
recyclerView.setLayoutManager(new LinearLayoutManager(context,
        LinearLayoutManager.HORIZONTAL, false));

// add pager behavior
PagerSnapHelper snapHelper = new PagerSnapHelper();
snapHelper.attachToRecyclerView(recyclerView);
{% endhighlight %}

We now have a bland, paging RecyclerView&mdash;okay, I'm not a designer, and this could be made to look better&mdash;where I added a background color here so that we can draw our decorations in white at the bottom of the view.

![ViewPagerDecoration]({{ site.baseurl }}/assets/viewpager-recyclerview/bland-pager.gif)

### Adding the Pager Indicator

**Note:** If you have no idea what decorations are you might find this [introduction to decorations][decorationBasics] a better place to start where I show how to draw a simple line between items.

Next up we need to add the decoration to draw the indicator. We create a `LinePagerIndicatorDecoration` and add it to our RecyclerView:

{% highlight java %}
// pager indicator
recyclerView.addItemDecoration(new LinePagerIndicatorDecoration());
{% endhighlight %}

We focus on 2 methods for our decoration:

* `getItemOffsets` to add some padding at the bottom where we can draw the decoration without overlaying any items view
* `onDrawOver` to draw our decoration on top of our view, which is especially important if we chose to not include an offset with `getItemOffsets` mentioned above

I like to use `getItemOffsets` to make sure I don't draw over any items, but if you prefer your indicator to overlay your views, you can just omit this method. All we do is request an `indicatorHeight` offset at the bottom of every view. If you were to use a GridLayoutManager you need to make sure only to offset the bottom row of your items.

{% highlight java %}
@Override
public void getItemOffsets(Rect outRect, View view,
                           RecyclerView parent, RecyclerView.State state) {
  super.getItemOffsets(outRect, view, parent, state);
  outRect.bottom = indicatorHeight;
}
{% endhighlight %}

This offset at the bottom is also why I set a background to the RecyclerView above and not to the pages themselves. The offset reserves a space for our decoration _below_ the content, so setting a background color on the items would have no effect since the decoration gets drawn _below_. If you choose not to offset your items and overlay them, you don't need to set a background color on your RecyclerView either.

Next we make sure to draw those indicators for all of our pages. We center the indicator at the bottom of the RecyclerView and draw a simple line for every item with some padding inbetween.

{% highlight java %}
@Override
public void onDrawOver(Canvas c, RecyclerView parent, RecyclerView.State state) {
  super.onDrawOver(c, parent, state);

  int itemCount = parent.getAdapter().getItemCount();

  // center horizontally, calculate width and subtract half from center
  float totalLength = mIndicatorItemLength * itemCount;
  float paddingBetweenItems = Math.max(0, itemCount - 1) * mIndicatorItemPadding;
  float indicatorTotalWidth = totalLength + paddingBetweenItems;
  float indicatorStartX = (parent.getWidth() - indicatorTotalWidth) / 2F;

  // center vertically in the allotted space
  float indicatorPosY = parent.getHeight() - mIndicatorHeight / 2F;

  drawInactiveIndicators(c, indicatorStartX, indicatorPosY, itemCount);
}

private void drawInactiveIndicators(Canvas c, float indicatorStartX,
                                    float indicatorPosY, int itemCount) {
  mPaint.setColor(colorInactive);

  // width of item indicator including padding
  final float itemWidth = mIndicatorItemLength + mIndicatorItemPadding;

  float start = indicatorStartX;
  for (int i = 0; i < itemCount; i++) {
    // draw the line for every item
    c.drawLine(start, indicatorPosY,
        start + mIndicatorItemLength, indicatorPosY, mPaint);
    start += itemWidth;
  }
}
{% endhighlight %}

This gives us the ability to draw one marker for every item, but there is no highlight yet that would indicate which page was active. In the next step we calculate how far we scrolled to smoothly animate between pages and draw the highlight.

We check with the LayoutManager to find the active page, then calculate the progress of the swipe by checking where the left side of the view is. This approach will obviously only work if your views width is `match_parent` or there would be different values and undefined behavior otherwise. To improve the look and feel of this animation I use an `AccelerateDecelerateInterpolator` on the progress values which results in a more natural look.

{% highlight java %}
// find active page (which should be highlighted)
LinearLayoutManager layoutManager = (LinearLayoutManager) parent.getLayoutManager();
int activePosition = layoutManager.findFirstVisibleItemPosition();
if (activePosition == RecyclerView.NO_POSITION) {
  return;
}

// find offset of active page (if the user is scrolling)
final View activeChild = layoutManager.findViewByPosition(activePosition);
int left = activeChild.getLeft();
int width = activeChild.getWidth();

// on swipe the active item will be positioned from [-width, 0]
// interpolate offset for smooth animation
float progress = mInterpolator.getInterpolation(left * -1 / (float) width);
{% endhighlight %}

With this progress we can now draw the highlight. It displays how far the user is along their swipe between pages. We use this `progress` to draw a partial highlight on the page indicators of both pages that are visible, or just a single plain highlight if the RecyclerView is at rest.

{% highlight java %}
public void onDrawOver(Canvas c, RecyclerView parent,
        RecyclerView.State state) {
  super.onDrawOver(c, parent, state);
  
  // draw normal lines ...
  
  // ... calculate progress ...
  
  // draw highlighted line
  drawHighlights(c, indicatorStartX, indicatorPosY, activePosition, progress, itemCount);
}

private void drawHighlights(Canvas c, float indicatorStartX, float indicatorPosY,
                            int highlightPosition, float progress, int itemCount) {
  mPaint.setColor(colorActive);

  // width of item indicator including padding
  final float itemWidth = mIndicatorItemLength + mIndicatorItemPadding;

  if (progress == 0F) {
    // no swipe, draw a normal indicator
    float highlightStart = indicatorStartX + itemWidth * highlightPosition;
    c.drawLine(highlightStart, indicatorPosY,
        highlightStart + mIndicatorItemLength, indicatorPosY, mPaint);
  } else {
    float highlightStart = indicatorStartX + itemWidth * highlightPosition;
    // calculate partial highlight
    float partialLength = mIndicatorItemLength * progress;

    // draw the cut off highlight
    c.drawLine(highlightStart + partialLength, indicatorPosY,
        highlightStart + mIndicatorItemLength, indicatorPosY, mPaint);

    // draw the highlight overlapping to the next item as well
    if (highlightPosition < itemCount - 1) {
      highlightStart += itemWidth;
      c.drawLine(highlightStart, indicatorPosY,
          highlightStart + partialLength, indicatorPosY, mPaint);
    }
  }
}
{% endhighlight %}

All of this gives us the promised indicator and we can now properly page our RecyclerView.

![ViewPagerDecoration]({{ site.baseurl }}/assets/viewpager-recyclerview/viewpagerdecoration.gif)

_The full source code can be found at my [GitHub repository][github-decoration]._

### Where to Go from Here?

As you may have noticed, I chose to draw lines instead of circles, but drawing circles and animating their alpha values would be just as easy. By using similar approaches you can do a lot of things with decorations and create reusable parts that do not require you to modify your other code.

The solution presented here is a proof of concept, and there are still a couple of sources for potential errors. As mentioned, the function to determine the progress might break with different widths, and an approach like `SnapHelper` uses internally would be better fitted. Make sure to test the implementation if you choose to use it in your app!

 [decorationBasics]:{% post_url 2015-11-10-recyclerview-with-decorations-basic-guide %}
 [github-decoration]:https://github.com/bleeding182/recyclerviewItemDecorations/blob/master/app/src/main/java/com/github/bleeding182/recyclerviewdecorations/viewpager/LinePagerIndicatorDecoration.java
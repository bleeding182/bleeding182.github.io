---
layout: post
title:  "Using RecyclerView with ItemDecorations - A Basic Separator Sample"
categories: android
tags:
- recyclerView
- itemDecoration
published: true
excerpt_separator: <!--more-->
---
`tl;dr` You can find the sample on [GitHub](https://github.com/bleeding182/recyclerviewItemDecorations/blob/master/app/src/main/java/com/github/bleeding182/recyclerviewdecorations/SeparatorDecoration.java).

I’ve seen many people come up with complicated and bloated solutions to problems that can actually be solved with decorations quite easily. Generally speaking, by using decorations you can, without modifying any code in your adapter

*   add a Header / Footer View
*   add margins and separators
*   set backgrounds
*   and more.

Easily added and reused with one line of code.

<!--more-->

## Basics

In this post, I want to explain the basic setup and use of item decorations by implementing a simple list separator.

Every decoration consists of 2 parts:

*   an (optional) additional required space for the view if you want to add paddings, margins or need to draw something around the view,
*   and the actual decoration itself that gets drawn on every view

The setup is easy. Just add your decorations along with the rest of the initial setup for your recyclerView.
{% highlight java %}
// ...
recyclerView.setLayoutManager(layoutManager);

// add the decoration to the recyclerView
SeparatorDecoration decoration = new SeparatorDecoration(this, Color.GRAY, 1.5f);
recyclerView.addItemDecoration(decoration);
{% endhighlight %}
I like decorations because they are easily reusable. You don’t have to adapt any of your existing code and most decorations will work with any recyclerView and content.

## Enter the first Decoration

We want to draw a separator between all of our list elements, so we are going to request some extra space on the bottom of the views to prevent overdrawing and finally draw a line on the bottom.

Let’s start with the empty new decoration.
{% highlight java %}
public class SeparatorDecoration extends RecyclerView.ItemDecoration {

}
{% endhighlight %}
First we have to do the initial setup to enable some customization for the color and thickness of the separator.
{% highlight java %}
private final Paint mPaint;

public SeparatorDecoration(Context context, int color, float heightDp) {
    mPaint = new Paint();
    mPaint.setColor(color);
    final float thickness = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP,
            heightDp, context.getResources().getDisplayMetrics());
    mPaint.setStrokeWidth(thickness);
}
{% endhighlight %}
Next we have to request some extra space beneath the view where we can draw without overdrawing. We do so by overwriting the base classes method and setting an offset at the bottom of each view.
{% highlight java %}
@Override
public void getItemOffsets(Rect outRect, View view, RecyclerView parent, RecyclerView.State state) {
    final RecyclerView.LayoutParams params = (RecyclerView.LayoutParams) view.getLayoutParams();

    // we want to retrieve the position in the list
    final int position = params.getViewAdapterPosition();

    // and add a separator to any view but the last one
    if (position < state.getItemCount()) {
        outRect.set(0, 0, 0, (int) mPaint.getStrokeWidth()); // left, top, right, bottom
    } else {
        outRect.setEmpty(); // 0, 0, 0, 0
    }
}
{% endhighlight %}
If the LayoutManager handles the layout correctly (watch out if using some custom LayoutManagers) we can now draw the separator. Again, we just override the base classes method.
{% highlight java %}
@Override
public void onDraw(Canvas c, RecyclerView parent, RecyclerView.State state) {
    // we set the stroke width before, so as to correctly draw the line we have to offset by width / 2
    final int offset = (int) (mPaint.getStrokeWidth() / 2);

    // this will iterate over every visible view
    for (int i = 0; i < parent.getChildCount(); i++) {
        // get the view
        final View view = parent.getChildAt(i);
        final RecyclerView.LayoutParams params = (RecyclerView.LayoutParams) view.getLayoutParams();

        // get the position
        final int position = params.getViewAdapterPosition();

        // and finally draw the separator
        if (position < state.getItemCount()) {
            c.drawLine(view.getLeft(), view.getBottom() + offset, view.getRight(), view.getBottom() + offset, mPaint);
        }
    }
}
{% endhighlight %}
And we are done. If you did everything right, your list just got some fancy separators! Possible improvements might include

*   get a theme color resource as the default color
*   set a margin for the separator
*   dashed / dotted lines

Next up, how to add a header / footer to recyclerViews by using ItemDecorations.

## Full Sample

A complete sample including a builder, the possibility to add margins or use a resource color can be located at [GitHub](https://github.com/bleeding182/recyclerviewItemDecorations/blob/master/app/src/main/java/com/github/bleeding182/recyclerviewdecorations/SeparatorDecoration.java).
{% highlight java %}
public class SeparatorDecoration extends RecyclerView.ItemDecoration {

    private final Paint mPaint;

    /**
     * Create a decoration that draws a line in the given color and width between the items in the view.
     *
     * @param context  a context to access the resources.
     * @param color    the color of the separator to draw.
     * @param heightDp the height of the separator in dp.
     */
    public SeparatorDecoration(@NonNull Context context, @ColorInt int color,
                               @FloatRange(from = 0, fromInclusive = false) float heightDp) {
        mPaint = new Paint();
        mPaint.setColor(color);
        final float thickness = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP,
                heightDp, context.getResources().getDisplayMetrics());
        mPaint.setStrokeWidth(thickness);
    }

    @Override
    public void getItemOffsets(Rect outRect, View view, RecyclerView parent, RecyclerView.State state) {
        final RecyclerView.LayoutParams params = (RecyclerView.LayoutParams) view.getLayoutParams();

        // we want to retrieve the position in the list
        final int position = params.getViewAdapterPosition();

        // and add a separator to any view but the last one
        if (position < state.getItemCount()) {
            outRect.set(0, 0, 0, (int) mPaint.getStrokeWidth()); // left, top, right, bottom
        } else {
            outRect.setEmpty(); // 0, 0, 0, 0
        }
    }

    @Override
    public void onDraw(Canvas c, RecyclerView parent, RecyclerView.State state) {
        // we set the stroke width before, so as to correctly draw the line we have to offset by width / 2
        final int offset = (int) (mPaint.getStrokeWidth() / 2);

        // this will iterate over every visible view
        for (int i = 0; i < parent.getChildCount(); i++) {
            // get the view
            final View view = parent.getChildAt(i);
            final RecyclerView.LayoutParams params = (RecyclerView.LayoutParams) view.getLayoutParams();

            // get the position
            final int position = params.getViewAdapterPosition();

            // and finally draw the separator
            if (position < state.getItemCount()) {
                c.drawLine(view.getLeft(), view.getBottom() + offset, view.getRight(), view.getBottom() + offset, mPaint);
            }
        }
    }
}
{% endhighlight %}
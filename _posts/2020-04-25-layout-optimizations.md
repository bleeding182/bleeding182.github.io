---
layout: post
title:  "Optimized Layout Strategies"
categories: android
tags:
- layouts
- xml
---

I'd like to take a look at how we can improve our most basic layouts&mdash;both for maintainability and for performance. Let's get right to it and take a look at this _very_ basic example of a list element for a simple label that should look familiar to both beginners and experts. While this is a very minimal example it's a great place to touch on a few topics relevant to us all.

{% highlight xml %}
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="48dp"
    android:background="@android:color/white">

    <TextView
        android:id="@+id/text"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginStart="16dp"
        android:text="My item text! :D"
        android:textColor="@android:color/black"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent" />
</androidx.constraintlayout.widget.ConstraintLayout>
{% endhighlight %}

Reading this layout should not pose a big challenge: It will display a single, centered text. To add some more context, I'd like to think of it as an item in a very basic list. Maybe you could already spot a few issues with the layout above, but let's take a look at it together!

## Wrapping Layouts

The thing you should notice first is that a `ConstraintLayout` wraps the `TextView` with our content. This isn't exactly wrong, but it's not great either as it only introduces overhead and wastes performance without adding any benefits. We don't need a layout to center the text here, neither to draw a background, nor to specify a height. There might be a few select cases when we need to wrap a view into a layout to give us more control, but most of the time we should be able to remove the wrapping layout and reduce the overall overhead.

In this case we use the wrapper to add a background and set a height. We'll take a closer look at both of them later, but for now we can merge the attributes into the `TextView`. We can transfer the background and height to the view and since we got rid of the layout we need to center the text in the view by setting the gravity to `center_vertical`. We end up with a shorter and more concise layout file.

{% highlight xml %}
<TextView xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/text"
    android:layout_width="match_parent"
    android:layout_height="48dp"
    android:background="@android:color/white"
    android:gravity="center_vertical"
    android:paddingStart="16dp"
    android:text="My item text! :D"
    android:textColor="@android:color/black" />
{% endhighlight %}

### The Cost of Constraints

I've mentioned that there might be some cases where we _need_ to wrap a view nonetheless, but there is a second issue hidden with the `ConstraintLayout`: The overhead introduced by the constraints themselves. `ConstraintLayout` is a great choice for complex layouts with multiple views, but we don't really need a `ConstraintLayout` to display a single view. `RelativeLayout` is an equally bad candidate as it requires multiple layout passes to resolve possible (much simpler) constraints. And a `LinearLayout` isn't the best candidate to display a single view either.

It's often best to use a simple `FrameLayout`. It displays views on top of each other and we can set a gravity. It doesn't offer a lot of features, but it would fit all our needs here. It probably wouldn't make much of a difference in our example, but if you decide to wrap more complex layouts, it surely will.

#### A Small Benchmark

I don't like stating facts without at least some data to support my claims, so to give us an idea of just _how much_ of a difference the choice of a simple _wrapping_ layout can make, I wrote a very simple benchmark attached below.

I took the example from the beginning and centered a TextView in a `ConstraintLayout`, `RelativeLayout`, `LinearLayout`, and `FrameLayout`, then did a number of inflations, measurements, and layouts on the views.

{% highlight kotlin %}
val list = listOf(
    "Constraint" to R.layout.item_bad_layout,
    "Frame" to R.layout.item_bad_layout2,
    "Relative" to R.layout.item_bad_layout3,
    "Linear" to R.layout.item_bad_layout4
)

val width = View.MeasureSpec.makeMeasureSpec(1000, View.MeasureSpec.EXACTLY)
val height = View.MeasureSpec.makeMeasureSpec(2000, View.MeasureSpec.UNSPECIFIED)

val integerInstance = NumberFormat.getIntegerInstance()
list.plus(list).plus(list).map { (name, layout) ->
    val start = System.nanoTime()
    for (i in 0..2000) {
        val view = inflater.inflate(layout, null)
        view.measure(width, height)
        view.layout(0, 0, view.measuredWidth, view.measuredHeight)
    }

    val diff = System.nanoTime() - start
    name to diff
}.forEach { (name, time) ->
    Log.d("Timing", "${integerInstance.format(time)}ns ($time) for $name")
}
{% endhighlight %}

With the sorted results of that last iteration, we can get an idea of how those layouts compare:

{% highlight text %}
506,469,500ns for Constraint
408,061,000ns for Relative
399,493,800ns for Linear
381,013,300ns for Frame
{% endhighlight %}

Keep in mind that, even if the `FrameLayout` is about ~30% faster than a `ConstraintLayout` in my results, this is still a very negligible difference in _most_ cases since we're talking about _nanoseconds_ saved. The key takeaway should be that a `FrameLayout` is not only good enough, but also happens to be the fastest.

## Item Heights

For the sake of brevity, we used some hardcoded text here, but if you've ever localized an app or worked with texts of varying lengths, then you probably noticed the cut-off text waiting to happen with our layout. Setting a fixed height on views with dynamic content is almost never a good idea. Users may use a bigger font size or we could choose to display a longer text, spanning multiple lines.

The best way to work with dynamic content is to use `wrap_content` to allow resizing of the view. Furthermore, we can use a minimum height and paddings to display the text correctly in all cases. Setting a minimum height ensures that the text remains "centered" even with little content, while the padding ensures that we won't touch the edges when the view grows.

{% highlight xml %}
<TextView xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/text"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:background="@android:color/white"
    android:gravity="center_vertical"
    android:minHeight="48dp"
    android:paddingStart="16dp"
    android:paddingTop="8dp"
    android:paddingEnd="16dp"
    android:paddingBottom="8dp"
    android:text="My item text! :D"
    android:textColor="@android:color/black" />
{% endhighlight %}

Since longer texts will also mean we'll reach the other horizontal edge of the screen, we should use `paddingEnd` along with `paddingStart` to ensure a nice layout within the bounds. Now we're prepared for any length of text.

## Colors and Themes

So far we've looked at the more visible bits, but next I'd like to focus on the hardcoded values used in the above layout.

Instead of coloring our background white, it would already be an improvement to move to a color resource we can control from within our project. Even better, we might choose to use `?android:colorBackground` or some other theme attribute to bind our view to the theme! It's hard to argue for theme attributes over your app's resources since most of us don't work on libraries or with multiple themes at once, but by using theme attributes we are forced to think more about _what_ we want and how it relates to the rest of the app, which should help with a more consistent overall design that remains highly customizable.

Most of us will already know about `?android:textColorPrimary` which is the default color for text used throughout the app. We can even apply a style to the view, like `@style/TextAppearance.AppCompat.Body1`, which also sets `textColorPrimary`  on our view among other attributes. But while using a style like this might pick up the correct theme colors, it's still not the best we can do. If you're working with the material components, you can use `?textAppearanceBody1` instead to use theme attributes here as well, but it wouldn't be hard to introduce our own attributes either.

We can also use a theme attribute for our minimum height instead of hardcoding it. Attributes like `?listPreferredItemHeightSmall` are readily available and help us with a consistent style.

### Text Colors

While the default settings might be good enough for our hobby projects, we will often face the need of specifying our own colors. We can apply those colors to the whole app, including dialogs or other vanilla controls by working with the app's theme as mentioned above, but there is one small caveat that's often missed: Typography often uses text colors with _some_ alpha level for a softer contrast. For example, the Material guidelines specify black with alpha levels of 87%, 60%, and 30% for high emphasis, medium emphasis, and disabled text respectively. So don't just set your text color to black&mdash;and don't forget about disabled states!

{% highlight xml %}
<TextView xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/text"
    style="?textAppearanceBody1"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:background="?android:colorBackground"
    android:gravity="center_vertical"
    android:minHeight="?listPreferredItemHeightSmall"
    android:paddingStart="16dp"
    android:paddingTop="8dp"
    android:paddingEnd="16dp"
    android:paddingBottom="8dp"
    android:text="My item text! :D" />
{% endhighlight %}

## Outer Margins

If we assume that this layout will be displayed from edge to edge (horizontally) then there's still one thing that's wrong with the layout as it is. While a horizontal padding of `16dp` is fine for _most_ phones, it is not for tablets (or phones bigger than `600dp` to be precise).

Material design works with keylines to align your views horizontally and the first one is situated at `16dp` or `24dp` (for tablets) by default. This is also the behavior of the toolbar and the reason why the its title and icon may not align correctly with your views on tablets if you use hardcoded dimensions for the outermost margins.

The good news is that we can use `?listPreferredItemPaddingStart` (and `?listPreferredItemPaddingEnd`) to follow the guidelines without having to define those dimensions ourselves.

{% highlight xml %}
<TextView xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/text"
    style="?textAppearanceBody1"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:background="?android:colorBackground"
    android:gravity="center_vertical"
    android:minHeight="?listPreferredItemHeightSmall"
    android:paddingStart="?listPreferredItemPaddingStart"
    android:paddingTop="8dp"
    android:paddingEnd="?listPreferredItemPaddingEnd"
    android:paddingBottom="8dp"
    android:text="My item text! :D" />
{% endhighlight %}

## Touch Feedback

Another small feature that can enhance usability greatly but tends to get overlooked easily is touch feedback. It's super confusing to hit a button and nothing happens&mdash;did I hit it? Or did the app freeze? A visual cue will also show what it is that you clicked on and can help you discover new features.

Adding it may be as simple as setting `?selectableItemBackground` as the background for most views. But since we already declare a background this isn't an option for our little example here. If you happen to target API level 23+ you may be able to add it as a foreground instead, but it's easy enough to create our own background. We can use theme attributes inside the drawable as well, so there's no need to hardcode any values here either.

{% highlight xml %}
<ripple xmlns:android="http://schemas.android.com/apk/res/android"
    android:color="?colorControlHighlight">
    <item>
        <shape>
            <solid android:color="?android:colorBackground" />
        </shape>
    </item>
</ripple>
{% endhighlight %}

By using this for our background we can now support click listeners as well and it will display just like we'd expect it to.

---

With all these changes done we have created a reusable layout that will work across all themes and locales, display all content, and align correctly on phones of all sizes. I hope these insights help to improve on some of the more common issues with even simple layouts, but we only touched on a lot of different topics and this post is by no means exhaustive, so be sure to experiment and build great layouts!


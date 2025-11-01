---
layout: post
title:  "Retrofit 2, converters and unwrapping json objects with RxJava"
categories: android
tags:
- retrofit
- converter
- gson
- rxjava
published: true
excerpt_separator: <!--more-->
---

*My two cents on how to deal with wrapped json objects by using Retrofit converters*

I'm sure everyone has had the joy of dealing with wrapped objects in json. The best part of them is that you get to check for errors 3 times: `IOException`, `isSuccessful`, and the response's custom result code, if you were to use the default `Call<>` object provided by Retrofit 2.

<!--more-->

Have a look at the following example:

{%highlight json%}
{
  "resultCode" : 0,
  "data" : {
    "name" : "David",
    "age" : 25
  }
}
{%endhighlight%}

The simple and straightforward approach to this object would look like the following and there is obviously some room for improvement.

{%highlight java%}
service.getWrappedPerson().enqueue(new Callback<WrappedResponse<Person>>() {
    @Override
    public void onResponse(Call<WrappedResponse<Person>> call, 
            Response<WrappedResponse<Person>> response) {
        if(response.isSuccessful()) {
            // 200 OK!
            WrappedResponse<Person> body = response.body();
            if(body.getResultCode() == 0) {
                // success! Read the response.
                Person data = body.getData();
            } else {
                // handle wrapped error codes
            }
        } else {
            // handle everything but 200 OK
        }
    }

    @Override
    public void onFailure(Call<WrappedResponse<Person>> call, Throwable t) {
        // handle connection errors
    }
});
{%endhighlight%}

You could go ahead and create your own `Callback` and include handling of the response there calling your own methods to work with, but I prefer to use RxJava anyways, so let's see how this would look.

Things seem a lot easier with RxJava: There's error and next, but this is just my personal opinion. I generally like to use RxJava because test implementations of your service can be `Observable.just(created)` very easily.

{%highlight java%}
service.getRxWrappedPerson()
        .subscribe(new Subscriber<WrappedResponse<Person>>() {
            @Override
            public void onCompleted() { /**/ }

            @Override
            public void onError(Throwable e) {
                if (e instanceof HttpException) {
                    // non 200 codes
                } else {
                    // connection errors
                }
            }

            @Override
            public void onNext(WrappedResponse<Person> response) {
                if(response.getResultCode() == 0) {
                    // handle custom success
                } else {
                    // handle custom errors
                }
            }
        });
{%endhighlight%}

But obviously this doesn't look right, either. There's still error handling in `onNext` where you just expect to be handling objects from your stream. RxJava has a lot of options that would offer to map this result and to properly handle those errors, but this is not the way I want to go.

I do not want to adapt my interface to the API. I just want an `Observable<Person>` to subscribe to without further wrapping the Retrofit service or adding some custom response handling. Retrofit offers a powerful API that I can use to do just that: Return the plain, unwrapped object.

## Using Retrofit converters

Retrofit offers the option to specify a converter that will parse the response into an object for you. `GsonConverterFactory` is probably one of the more popular ones.

{%highlight java%}
new Retrofit.Builder()
    .addConverterFactory(GsonConverterFactory.create())
    /**/.build();
{%endhighlight%}

Since they handle the parsing of the response into objects, this is also where I want to hook in. The following describes how you could create your own converter to unwrap the API response in one place and to not have to deal with it in any other parts of your app.

If you find yourself asking *Why would you do it* that *way?* I have to say my reasoning is fairly simple: Abstraction. I can pack all of this API parsing and unwrapping code into a single package and hide it from the rest of the application. The only thing exposed to the rest of my app is a clean and easy to use interface.

### Create a converter factory and handle the result

I do not want to reinvent the wheel. Gson offers powerful parsing of json objects and I can also create dynamic types. If I want my `Person` I just have to tell Gson to parse the response as a `WrappedResponse<Person>` and go on from there.

{%highlight java%}
public class UnwrapConverterFactory extends Converter.Factory {

    private GsonConverterFactory factory;

    public UnwrapConverterFactory(GsonConverterFactory factory) {
        this.factory = factory;
    }

    @Override
    public Converter<ResponseBody, ?> responseBodyConverter(final Type type,
            Annotation[] annotations, Retrofit retrofit) {
        // e.g. WrappedResponse<Person>
        Type wrappedType = new ParameterizedType() {
            @Override
            public Type[] getActualTypeArguments() {
                // -> WrappedResponse<type>
                return new Type[] {type};
            }

            @Override
            public Type getOwnerType() {
                return null;
            }

            @Override
            public Type getRawType() {
                return WrappedResponse.class;
            }
        };
        Converter<ResponseBody, ?> gsonConverter = factory
                .responseBodyConverter(wrappedType, annotations, retrofit);
        return new WrappedResponseBodyConverter(gsonConverter);
    }
}
{%endhighlight%}

The code above wraps the gson factory and will use its implementation to parse the wrapped object. While we are handling `Person`, the gson converter gets initialized to parse the `WrappedResponse<Person>`. With this, all that's left now is to properly read the data from the response as you can see below.

{%highlight java%}
public class WrappedResponseBodyConverter<T>
        implements Converter<ResponseBody, T> {
    private Converter<ResponseBody, WrappedResponse<T>> converter;

    public WrappedResponseBodyConverter(Converter<ResponseBody,
            WrappedResponse<T>> converter) {
        this.converter = converter;
    }

    @Override
    public T convert(ResponseBody value) throws IOException {
        WrappedResponse<T> response = converter.convert(value);
        if (response.getResultCode() == 0) {
            return response.getData();
        }
        // RxJava will call onError with this exception
        throw new WrappedError(response.getResultCode());
    }
}
{%endhighlight%}

And this is basically all the magic to it. RxJava will handle the exception and my app can make use of a clean interface&mdash;it does not have to know *anything* about wrapped objects.

If we have a look at the result&hellip;

{%highlight java%}
service.getRxPerson()
        .subscribe(new Subscriber<Person>() {
            @Override
            public void onCompleted() { /**/ }

            @Override
            public void onError(Throwable e) {
                if(e instanceof WrappedError) {
                    // handle custom error)
                } else if(e instanceof HttpException) {
                    // handle http errors
                } else {
                    // handle connection errors
                }
            }

            @Override
            public void onNext(Person person) {
                // finally myself
            }
        });
{%endhighlight%}

&hellip;this is how I prefer it.

---
layout: default
title: Hello World
overview: true
priority: 3
---


Tutorial: Hello World
=====================

Access the Web interface to the [previously](installation.html) instantiated engine, e.g. [http://localhost:8125](http://localhost:8125).

For a running Hello World example you need to do three things:

1. Create an ***Action Dispatcher***
2. Create a ***Rule***
3. Invoke an ***Event*** which triggers the ***Rule***, that uses your ***Action Dispatcher***



## Setup Your first ***Action Dispatcher***

**1\. In the navigation, click on "Create AD":**

> ![CreateAD]({{ site.baseurl }}/images/CreateADLink.png)



You will see an already prefilled Action Dispatcher, called "ProBinder":

> ![CreateAD]({{ site.baseurl }}/images/CreateAD.png)

**2\. Cleanup the editor:**

- Remove the entire code from the editor.
- Also remove the prefilled user-specific properties `username` and `password` on the right-hand side of the editor, by clicking the red crosses.
- Now enter your own module name: `Logging`, instead of `ProBinder`. For our "Hello World" example we will log something as a result of an event.



**3\. Enter Module Code that allows you to log things:**

> {% highlight coffeescript %}
exports.writeLog = ( msg ) ->
    log msg
{% endhighlight %}

**4\. Click `save` to store your first Action Dispatcher**

What you defined now in the body of the module `Logger` is:

- The module has one action which is called `writeLog`. This is achieved by attaching the function `writeLog` to the system internal `exports` object.
- The action `writeLog` will receive one piece of data which we call `msg`.
- Whenever the action `writeLog` is executed, it will use the system function `log` to create a log entry of the retrieved message.


## Setup Your first Rule


## Emit Your first Event into the System
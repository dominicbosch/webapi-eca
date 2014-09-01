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



## 1\. Setup Your first ***Action Dispatcher***

**1.1\. In the navigation, click on "Create AD":**

> ![CreateAD]({{ site.baseurl }}/images/CreateADLink.png)



You will see an already prefilled Action Dispatcher, called "ProBinder":

> ![CreateAD]({{ site.baseurl }}/images/CreateAD.png)

**1.2\. Cleanup the editor:**

- Remove the entire code from the editor.
- Also remove the prefilled user-specific properties `username` and `password` on the right-hand side of the editor, by clicking the red crosses.
- Now enter your own module name: `Logging`, instead of `ProBinder`. For your "Hello World" example you will log a text as a result of an event.



**1.3\. Enter _Action Dispatcher_ Module Code that allows you to log things:**

{% highlight coffeescript %}
exports.writeLog = ( msg ) ->
    log msg
{% endhighlight %}

**1.4\. Click `save` to store your first _Action Dispatcher_**

The system will respond with the message `Module Logger successfully stored! Found following function(s): writeLog`:

> ![CreateAD_Done]({{ site.baseurl }}/images/CreateAD_Done.png)

***-> Congratulations you stored your first Action Dispatcher!***

> * * *
> By the way, what does the **Action Dispatcher**'s module code mean:
> 
> - The module provides one choosable action which is called `writeLog`. In a ***Rule*** it will be called `Logger -> writeLog`. This is achieved by attaching the function `writeLog` to the system internal `exports` object.
> - The action `writeLog` will receive one argument which we call `msg` in the scope of the `writeLog` function.
> - Whenever the action `writeLog` is executed, it will use the system function `log` to create a log entry of the retrieved argument `msg`, which should be a message in string form.
> 
> * * *

## 2\. Setup Your first ***Rule***
> ![CreateRuleEmpty]({{ site.baseurl }}/images/CreateRuleEmpty.png)


## 3\. Emit Your first Event into the System
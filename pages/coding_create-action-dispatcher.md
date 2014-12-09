---
layout: default
title: Create Action Dispatcher
overview: true
folder: coding
priority: 2
---


Create Action Dispatcher
========================


**1\.** In the navigation, click on "Create AD":

> ![CreateAD]({{ site.baseurl }}/images/CreateADLink.png)



You will see an already prefilled ***Action Dispatcher***, called "ProBinder":

> ![CreateAD]({{ site.baseurl }}/images/CreateAD.png)

**2\.** Cleanup the editor:

- Remove the entire code from the editor.
- Also remove the prefilled user-specific properties `username` and `password` on the right-hand side of the editor, by clicking the red crosses.
- Now type your own `Module Name`: `Logging`, instead of `ProBinder`. For your "Hello World" example you will log a text as a result of an event.



**3\.** Enter ***Action Dispatcher*** Module Code that allows you to log things:

{% highlight coffeescript %}
exports.writeLog = ( msg ) ->
    log msg
{% endhighlight %}

**4\.** Click "save" to store your first ***Action Dispatcher***

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


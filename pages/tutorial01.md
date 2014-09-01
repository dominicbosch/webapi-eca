---
layout: default
title: Hello World Event
overview: true
priority: 3
---


Tutorial: Hello World Event
===========================

Access the Web interface to the [previously](installation.html) setup engine at the given port in the configuration file, e.g. [Web Interface](http://localhost:8125).




## Setup Your first Action Dispatcher

First you will need to create an Action Dispatcher in order to set up a valid rule.

1\. In the navigation, click on "Create AI":

![CreateAI]({{ site.baseurl }}/images/CreateAI.png)



### Cleanup prefilled Example

You will see an already prefilled Action Dispatcher, called "ProBinder":

![CreateAI1]({{ site.baseurl }}/images/CreateAI1.png)

2\. Clean up the editor for a plain example:

- Remove the entire code from the editor.
- Also remove the prefilled user-specific properties `username` and `password` on the right-hand side of the editor, by clicking the red crosses.
- Now enter your own module name: `Logging`, instead of `ProBinder`. For our "Hello World" example we will log something as a result of an event.



### Enter Module Code

Now enter the code which allows you to log things:

{% highlight coffeescript %}
exports.writeLog = ( msg ) ->
    log msg
{% endhighlight %}

And finally click `save` to store your new Action Dispatcher

What you defined now in the body of the module `Logger` is:

- The module has one action which is called `writeLog`. This is achieved by attaching the function `writeLog` to the system internal `exports` object.
- The action `writeLog` will receive one piece of data which we call `msg`.
- Whenever the action `writeLog` is executed, it will use the system function `log` to create a log entry of the retrieved message.


## Setup Your first Rule


## Emit Your first Event into the System
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

1. Setup Your first ***Action Dispatcher***
2. Setup Your first ***Rule***
3. Emit Your first ***Event*** into the System, which triggers the ***Rule***, that uses your ***Action Dispatcher***

<br>

## **1\. Setup Your first _Action Dispatcher_**

**1.1\.** In the navigation, click on "Create AD":

> ![CreateAD]({{ site.baseurl }}/images/CreateADLink.png)



You will see an already prefilled ***Action Dispatcher***, called "ProBinder":

> ![CreateAD]({{ site.baseurl }}/images/CreateAD.png)

**1.2\.** Cleanup the editor:

- Remove the entire code from the editor.
- Also remove the prefilled user-specific properties `username` and `password` on the right-hand side of the editor, by clicking the red crosses.
- Now type your own `Module Name`: `Logging`, instead of `ProBinder`. For your "Hello World" example you will log a text as a result of an event.



**1.3\.** Enter ***Action Dispatcher*** Module Code that allows you to log things:

{% highlight coffeescript %}
exports.writeLog = ( msg ) ->
    log msg
{% endhighlight %}

**1.4\.** Click "save" to store your first ***Action Dispatcher***

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



<br>


## **2\. Setup Your first _Rule_**

**2.1\.** In the navigation, click on "Create Rule":


> ![CreateRuleLink]({{ site.baseurl }}/images/CreateRuleLink.png)

You will see the skeleton of an empty ***Rule***, called "My new Rule":

> ![CreateRuleEmpty]({{ site.baseurl }}/images/CreateRuleEmpty.png)

An **ECA-Rule** has three sections: **EVENT**, **CONDITIONS** and **ACTIONS**:

> ![ECA-Explanation]({{ site.baseurl }}/images/ECA-Explanation.png)

Whenever the specified **EVENT** is detected, it will be compared against the **CONDITIONS** and if all are met, the **ACTIONS** are dispatched.


**2.2\.** Type `Hello World Rule` in the input field `Rule Name`


**2.3\.** In the select box `Event Type`, select `Custom Event`


**2.4\.** In the input field `Event Name`, type `button-click`


**2.5\.** Leave the **CONDITIONS** section empty for now (keep the existing brackets)


**2.6\.** In the select box under **ACTIONS**, choose `Logger -> writeLog`


**2.7\.** In the input filed `msg` that should show up now, type `Hello World`


**2.8\.** Click "Save Rule"

The system responds with `Rule 'Hello World Rule' stored and activated!`:

> ![CreateRuleDone]({{ site.baseurl }}/images/CreateRuleDone.png)


***-> Congratulations you stored your first Rule!***

<br>

## **3\. Emit Your first Event into the System**

The system is now listening for `button-click` ***Events*** and will dispatch your chosen ***Action*** as soon as such an ***Event*** is detected. In order to emit such an ***Event*** into the system you need to...

**3.1\.** ...click on "Push Event", in the navigation:

> ![PushEventLink]({{ site.baseurl }}/images/PushEventLink.png)

You will see a prefilled **Event** in JSON format.

> ![PushEventSkeleton]({{ site.baseurl }}/images/PushEventSkeleton.png)

The type of the ***Event*** is `button-click`, the same as you just defined in your first ***Rule***. You do not need to care about the `body` section of the ***Event*** for now and could also just delete that section, so you're left only with:

{% highlight json %}
{
  "eventname": "button-click"
}
{% endhighlight %}


**3.2\.** Now click on "Push Event into System" and the system will respond with `Thank you for the event: button-click`:

> ![PushEventDone]({{ site.baseurl }}/images/PushEventDone.png)

***-> Congratulations you emmitted your first Event into the system!***

<br>

## **4\. Check the Result**

Now you need to check the ***Rule*** log in order to see the result of this Hello World tutorial.

**4.1\.** Click on "Edit Rules", in the navigation:

> ![EditRulesLink]({{ site.baseurl }}/images/EditRulesLink.png)

You see a list of all your active ***Rules***, which currently only consists of your `Hello World Rule`. Hover over the icon that looks like a sheet of paper. A tooltip saying `Show Rule Log` appears.

**4.2\.** Click on the "Show Rule Log" icon of the `Hello World Rule`:

> ![EditRules]({{ site.baseurl }}/images/EditRules.png)

Ỳou will see all the log entries that correspond to your ***Rule***. For your ***Rule*** this should be the initialization of the ***Rule*** and also the manually triggered ***Event*** with the logged message `Hello World`:

> ![EditRulesLog]({{ site.baseurl }}/images/EditRulesLog.png)

***Congratulations, you completed the Hello World tutorial!***

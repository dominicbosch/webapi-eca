---
layout: default
title: Hello World for Groups
overview: true
folder: tutorial
priority: 2
---


Tutorial: Hello World for Groups
================================

Access the Web interface to the [previously](installation.html) instantiated engine, e.g. [http://localhost:8125](http://localhost:8125).

For a running Hello World example you need to do three things:

1. Setup Your first ***Rule***
2. Emit Your first ***Event*** into the System, which triggers the ***Rule***, that uses your ***Action Dispatcher***


## **1\. Setup Your first _Rule_**

**1.1\.** In the navigation, click on "Create Rule":


> ![CreateRuleLink]({{ site.baseurl }}/images/CreateRuleLink.png)

You will see the skeleton of an empty ***Rule***, called "My new Rule":

> ![CreateRuleEmpty]({{ site.baseurl }}/images/CreateRuleEmpty.png)

An **ECA-Rule** has three sections: **EVENT**, **CONDITIONS** and **ACTIONS**:

> ![ECA-Explanation]({{ site.baseurl }}/images/ECA-Explanation.png)

Whenever the specified **EVENT** is detected, it will be compared against the **CONDITIONS** and if all are met, the **ACTIONS** are dispatched.


**1.2\.** Type `Hello World Rule` in the input field `Rule Name`


**1.3\.** In the select box `Event Type`, select `Custom Event`


**1.4\.** In the input field `Event Name`, type `button-click`


**1.5\.** Leave the **CONDITIONS** section empty for now (keep the existing brackets)


**1.6\.** In the select box under **ACTIONS**, choose `Logger -> writeLog`


**1.7\.** In the input filed `msg` that should show up now, type `Hello World`


**1.8\.** Click "Save Rule"

The system responds with `Rule 'Hello World Rule' stored and activated!`:

> ![CreateRuleDone]({{ site.baseurl }}/images/CreateRuleDone.png)


***-> Congratulations you stored your first Rule!***

<br>

## **2\. Emit Your first Event into the System**

The system is now listening for `button-click` ***Events*** and will dispatch your chosen ***Action*** as soon as a `button-click` ***Event*** is detected. In order to emit such an ***Event*** into the system you need to...

**2.1\.** ...click on "Push Event", in the navigation:

> ![PushEventLink]({{ site.baseurl }}/images/PushEventLink.png)

You will see a prefilled **Event** in JSON format.

> ![PushEventSkeleton]({{ site.baseurl }}/images/PushEventSkeleton.png)

The type of the ***Event*** is `button-click`, the same as you just defined in your first ***Rule***. You do not need to care about the `body` section of the ***Event*** for now and could also just delete that section, so you're left only with:

{% highlight json %}
{
  "eventname": "button-click"
}
{% endhighlight %}


**2.2\.** Now click on "Push Event into System" and the system will respond with `Thank you for the event: button-click`:

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

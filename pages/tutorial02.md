---
layout: default
title: Forward Event Data to Actions
overview: true
priority: 4
---


Tutorial: Forward Event Data to Actions
=======================================

In the [Hello World Tutorial](tutorial01.html), you have seen how to set up a basic working example on the ECA engine. But one important key capability of the system, the forwarding of ***Event*** information to ***Actions***, still needs to be introduced.

If you have not completed the [Hello World Tutorial](tutorial01.html) yet, you should go through the tutorial in order to setup a working example which you can edit.


<br>

## **1\. Edit your "Hello World Rule"**


**1.1\.** Click on "Edit Rules", in the navigation:

> ![EditRulesLink]({{ site.baseurl }}/images/EditRulesLink.png)

You see a list of all your active ***Rules***, which currently only consists of your `Hello World Rule`. Hover over the icon that looks like a sheet of paper with a pen on top. A tooltip saying `Edit Rule` appears.


**1.2\.** Click on the "Edit Rule" icon of the `Hello World Rule`:

> ![EditRulesEdit]({{ site.baseurl }}/images/EditRulesEdit.png)

You will see the ***Rule*** as by the end of step 2 of the [Hello World Tutorial](tutorial01.html).


**1.3\.** In the **ACTIONS** section of the ***Rule***, change the `msg` from `Hello World` to `#{ .subject }`:

> ![EditRulesSubject]({{ site.baseurl }}/images/EditRulesSubject.png)


**1.4\.** Click on "Save Rule" and confirm the popup request.

<br>

## **2\. Push an _Event_ with data into the system**


**2.1\.** Click on "Push Event", in the navigation:

> ![PushEventLink]({{ site.baseurl }}/images/PushEventLink.png)

This time you need to leave the `body` section with the `subject`, because this piece of information is what you are referring to in the **Rule** now, since you typed `#{ .subject }` in the `msg` argument of the `Logger -> writeLog` ***Action Dispatcher***.


**2.2\.** Type `Data forwarding test` in the `subject` of the ***Event's*** body:

> ![PushEventData]({{ site.baseurl }}/images/PushEventData.png)


**2.3\.** Click on "Push Event into System" and the system will respond with `Thank you for the event: button-click`:

> ![PushEventDone]({{ site.baseurl }}/images/PushEventDone.png)

<br>

## **3\. Check the Tutorial Result**

Now you need to check the ***Rule*** log again in order to see the result of this data forwarding tutorial.

**3.1\.** Click on "Edit Rules", in the navigation:

> ![EditRulesLink]({{ site.baseurl }}/images/EditRulesLink.png)

**3.2\.** Click on the "Show Rule Log" icon of the `Hello World Rule`:

> ![EditRules]({{ site.baseurl }}/images/EditRules.png)

Ỳou should now see the manually triggered ***Event*** with the logged message consisting of your forwarded data `Data forwarding test`:

> ![EditRulesLog]({{ site.baseurl }}/images/EditRulesLogForwarded.png)

***Congratulations, you successfully forwarded data from an Event to an Action Dispatcher!***
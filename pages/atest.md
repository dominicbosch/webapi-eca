---
layout: default
title: Data Acquiring
overview: true
---


A Test
========

### Installation of the System

{% highlight javascript %}
/**
 * Converts an RGB color number to a hex color string if valid.
 * @param {number} color A 6-digit hex RGB color code as a number.
 * @return {?string} A CSS representation of the color or null if invalid.
 */
function convertToHexColor(color) {
  // Color must be a number, finite, with no fractional part, in the correct
  // range for an RGB hex color.
  if (isFinite(color) && Math.floor(color) == color &&
      color >= 0 && color <= 0xffffff) {
    var hexColor = color.toString(16);
    // Pads with initial zeros and # (e.g. for 'ff' yields '#0000ff').
    return '#000000'.substr(0, 7 - hexColor.length) + hexColor;
  }
  return null;
}
{% endhighlight %}


### Hello World Event


```html
<html><head><title></title></head></html>
```

{% highlight python %}
def yourfunction():
     print "Hello World!"
{% endhighlight %}


~~~ ruby
def what?
  42
end
~~~

### HTML Scraping job
Text output, true/false, condition check


### Data Acquiring
Data visualization


### Notification 


### Mobile Alert Service


### CMS Enrichment


### Voting Event
time period -> rating from world wide different IP addresses.


## Documentation
# Building process
# Node.js


---
layout: default
title: System Installation
overview: true
priority: 1
---


System Installation
===================
> The server is started through the [webapi-eca.js](https://github.com/dominicbosch/webapi-eca/blob/master/js/webapi-eca.js) module by calling
> `node js/webapi-eca.js`. 


Getting started
---------------

**Prerequisites:**

 - node.js (find it [here](http://nodejs.org/))
 - *(optional) Pygments if you want to generate the doc:
    `sudo apt-get install python-setuptools` and then 
    `sudo easy_install Pygments`*
 - *(optional) [CoffeeScript](http://coffeescript.org/), if you want to develop
    and compile from coffee sources: `sudo npm -g install coffee-script`*
 
Clone project:

    git clone https://github.com/dominicbosch/webapi-eca.git

Download and install dependencies:

    cd webapi-eca
    npm install

Get your [redis](http://redis.io/) instance up and running ( and find the port for the config file below ) or create your own `js/persistence.js`. Visit their page, for Ubuntu this is fairly easy:

    sudo apt-get update
    sudo apt-get install build-essential
    sudo apt-get install tcl8.5
    wget http://download.redis.io/redis-stable.tar.gz
    tar xvzf redis-stable.tar.gz
    cd redis-stable
    make
    make test
    sudo make install
    cd utils
    sudo ./install_server.sh


Edit the configuration file:

    vi config/system.json

Apply your settings, for example:

{% highlight json %}
{
  "http-port": 8125,
  "db-port": 6379,
  "log": {
    "mode": "development",
    "io-level": "info",
    "file-level": "info",
    "file-path": "server.log",
    "nolog": "false"
  }
}
{% endhighlight %}

The configurations properties are:

  - `http-port: The port on which the system listens for requests
  - `db-port`: The db-port where your redis instance is listening
  - `log`: Logging configuration
    - `mode`: If set to productive no expensive origin lookup is performed and logged
    - `io-level`: The log-level for the std I/O stream
    - `file-level`: The log-level for the log file
    - `file-path`: Log file path, relative to cwd
    - `nolog`: False if no log shall be generated at all. Mainly used for unit tests

Start the server:

    run_engine.sh
    
*Congratulations, your own WebAPI based ECA engine server is now up and running!*


Optional command line scripts
-----------------------------
        
Run test suite:

    run_tests.sh

Create the doc *(to be accessed via the webserver, e.g.: localhost:8125/doc/)*:

    run_doc.sh
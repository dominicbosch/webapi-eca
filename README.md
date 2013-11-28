README: webapi-eca
==================

# TODO Remake

>A Modular ECA Engine Server which acts as a middleware between WebAPI's.
>This folder continues examples of an ECA engine and how certain use cases could be implemented together with a rules language.
>
>
>The server is started through the [server.js](server.html) module by calling `node rule_server.js`. 


Getting started
---------------

**Prerequisites:**

 - node.js (find it [here](http://nodejs.org/))
 - *(optional) [CoffeeScript](http://coffeescript.org/), if you want to compile from coffee sources:*
 
		sudo npm -g install coffee-script
 
Clone project:

    git clone https://github.com/dominicbosch/webapi-eca.git

Download and install dependencies:

    cd webapi-eca
    npm install

Get your [redis](http://redis.io/) instance up and running (and find the port for the config file below) or create your own `js/db_interface.js`.

Edit the configuration file:

    vi config/config.json

Apply your settings, for example:

    {
        "http_port": 8125,
        "db_port": 6379,
        "crypto_key": "[your key]",
        "session_secret": "[your secret]"
    }

Start the server:

    node js/server
    
*Congratulations, your own WebAPI based ECA engine server is now up and running!*


Optional command line tools:
----------------------------
    
Create the doc *(to be accessed via the webserver, e.g.: localhost:8125/doc/)*:

    node create_doc
    
Run test suite:

    node run_tests

_

TODO
----

* Redis queue
* user handling (personal credentials)
* security in terms of users (private key, login)
* vm for modules, only give few libraries (no fs!)
* rules generator (provide webpage that is used to create rules dependent on the existing modues)
* geo location module, test on smartphone.

_

TODO per module
---------------

Testing | clean documentation | Clean error handling (Especially in loading of modules and their credentials):

* DB Interface
* Engine
* Event Poller
* HTTP Listener
* Logging
* Module Loader
* Module Manager
* Server


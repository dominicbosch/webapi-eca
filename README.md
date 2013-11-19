README: webapi-eca
==================

>A Modular ECA Engine Server which acts as a middleware between WebAPI's.
>This folder continues examples of an ECA engine and how certain use cases could be implemented together with a rules language.
>Be sure the user which runs the server doesn't have ANY write rights on the server!
>Malicious modules could capture or destroy your server!
>
>
>The server is started through the [rules_server.js](rules_server.html) module by calling `node rule_server.js`. 


Getting started
---------------
Prerequisites:

 - node.js & npm (find it [here](http://nodejs.org/))
 - *(optional) coffee, if you want to compile from coffee sources:*
 
 	sudo npm -g install coffee-script
 
Clone project:

    git clone https://github.com/dominicbosch/webapi-eca.git

Download and install dependencies:

    cd webapi-eca
    npm install

Get your [redis](http://redis.io/) instance up and running (and find the port for the config file below) or create your own `db_interface.js`.

Create the configuration file:

    mkdir config
    vi config/config.json
    
Insert your settings, for example:

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
Run test suite:

    node run_tests
    
Create the doc *(to be accessed via the webserver, e.g.: localhost:8125/doc/)*:

    node create_doc

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


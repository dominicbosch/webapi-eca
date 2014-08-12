README: webapi-eca
==================
> A Modular ECA Engine Server which acts as a middleware between WebAPI's.
> 
> The server is started through the [webapi-eca.js](webapi-eca.html) module by calling
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

Get your [redis](http://redis.io/) instance up and running ( and find the port for the config file below ) or create your own `js/persistence.js`.
> Checkout their page, but for ubuntu it was fairly easy:
> sudo apt-get update
> sudo apt-get install build-essential
> sudo apt-get install tcl8.5
> wget http://download.redis.io/redis-stable.tar.gz
> tar xvzf redis-stable.tar.gz
> cd redis-stable
> make
> make test
> sudo make install
> cd utils
> sudo ./install_server.sh


Edit the configuration file:

    vi config/system.json

Apply your settings, for example:

    {
      "http-port": 8125,            # The port on which the system listens for requests
      "db-port": 6379,              # The db-port where your redis instance is listening
      "log": {                      ### logging configurations
        "mode": "development",      # if set to productive no expensive origin lookup is performed and logged
        "io-level": "info",         # the log-level for the std I/O stream
        "file-level": "info",       # the log-level for the log file
        "file-path": "server.log"   # log file path, relative to cwd
        "nolog": "false"            # false if no log shall be generated at all. Mainly used for unit tests
      }
    }

Start the server:

    run_engine.sh
    
*Congratulations, your own WebAPI based ECA engine server is now up and running!*


Optional command line scripts
-----------------------------
        
Run test suite:

    run_tests.sh

Create the doc *(to be accessed via the webserver, e.g.: localhost:8125/doc/)*:

    run_doc.sh
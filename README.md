README: webapi-eca
==================
> A Modular ECA Engine Server which acts as a middleware between WebAPI's.
> 
> The server is started through the [webapi-eca.js](webapi-eca.html) module by calling
> `node js/webapi-eca.js`.
> An alternative ( e.g. for development ) is to use the supported build system gulp
> by executing `gulp start`, which will start the server and restart it whenever relevant
> files change.


Getting started
---------------

**Prerequisites:**

 - `node.js` (v0.12.7) and `npm` (find it [here](http://nodejs.org/))
 - *(optional) Gulp if you want to use the implemented build tool:
    `sudo npm install -g gulp*
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
    
In case you receive an error containing 'WARN This failure might be due to the use of legacy binary "node"', try to solve it with nodejs-legacy: 

    sudo apt-get install nodejs-legacy

Get your [redis](http://redis.io/) instance up and running ( and find the port for the config file below ) or create your own `js/persistence.js`.

> Checkout [their page](http://redis.io/), but for ubuntu it was fairly easy:

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


Edit the system's configuration file:

    vi config/system.json

Apply your settings, for example (default values listed below):

    {
      "http-port": 8125,                # The port on which the system listens for requests
      "db-port": 6379,                  # The db-port where your redis instance is listening
      "keygenpp": "[Something safe!]"   # The keygen passphrase for the private / public key pairs for secure user data
      "log": {                          ### logging configurations
        "mode": "productive",           # if set to productive no expensive origin lookup is performed and logged
        "std-level": "info",            # the log-level for the std I/O stream
        "file-level": "info",           # the log-level for the log file
        "file-path": "server.log"       # log file path, relative to cwd
        "nolog": "true"                 # Just skip this flag if you want to have a log
      },
      "usermodules": {                  # usermodules are the nodejs mpôdules that are available to the users in order to
        "keen": {                       # use them in Event Triggers and Action Dispatchers
            "module": "keen-js",
            "description": "The client for posting events to keen.io"
        },
        [ ... ]
      }
    }

Start the server:

    gulp start
    
*Congratulations, your own WebAPI based ECA engine server is now up and running!*


Use Gulp
--------
 
We used [gulp](http://gulpjs.com/) as a building tool, hence you can just execute `gulp`
in the root folder of this project and it will display all available gulp commands to you.

The most relevant command for development will be:

    gulp start --watch

This will start the system with a monitoring system ([nodemon](http://nodemon.io/)) and
restart it whenever core files change.
It will also watch for all the client side files and deploy them to the server whenever they change.

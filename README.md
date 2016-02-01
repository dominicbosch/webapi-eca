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

 - `node.js` (v5.5.0) and `npm` (v3.6.0) (find it [here](http://nodejs.org/)). Be sure you have at least these versions installed or otherwise some packages might fail to install.
 - Running [PostgreSQL](http://www.postgresql.org/) (update config/system.json)
 - Running [Firebase](https://www.firebase.com/) (update config/system.json)
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
    
> *In case you receive an error containing `WARN This failure might be due to the use of legacy binary "node"`, try to solve it with nodejs-legacy:* 
> 
>     sudo apt-get install nodejs-legacy

Edit the system's configuration file:

    vi config/system.json

Apply your settings, for example (default values listed below):

    {
        "httpport": 8080,                   # port on which the system listens for requests
        "db": {                             # main DB configuration
            "module": "postgres",           # DB module to be used from the folder 'persistence'
            "host": "localhost",            # host where the DB resides
            "port": 5432,                   # port the DB listens on
            "db": "webapi-eca",             # DB name
            "user": "[postgres-user]",      # DB username
            "pass": "[postgres-password]"   # DB password
        },
        "firebase": {                       # Firebase is used to monitor the user processes
            "app": "https://[your-app].firebaseio.com/",
            "token": "[super-secret-string-goes-here]"
        },
        "mode": "development",              # Safe haven, No crash and burn
        "log": {
            "stdlevel": "info",             # the log-level for the std I/O stream
            "filelevel": "info",            # the log-level for the log file
            "filepath": "logs/server.log",  # log file path, relative to cwd
            "trace": "off",                  # if set to productive no expensive origin lookup is performed and logged
            "nolog": "true"                 # Remove this flag if you want to have a log
        },
        "keygenpp": "[TODO this has to come from prompt when server is started!]"
    }

Start the server:

    gulp start
    
*Congratulations, your own WebAPI based ECA engine server is now up and running!*


Use Gulp
--------
 
We used [gulp](http://gulpjs.com/) as a building tool, hence you can just execute `gulp`
in the root folder of this project (if you installed it...) and it will display all available gulp commands to you.

The most relevant command for development will be:

    gulp develop --watch

This will start the system with a monitoring system ([nodemon](http://nodemon.io/)) and
restart it whenever core files change.
It will also watch for all the client side files and deploy them to the server whenever they change.


###
Rules Server
============
This is the main module that is used to run the whole server:

    node server [log_type http_port]

Valid `log_type`'s are:

- `0`: standard I/O output (default)
- `1`: log file (server.log)
- `2`: silent

`http_port` can be set to use another port, than defined in the 
[config](config.html) file, to listen to, e.g. used by the test suite.

###
root = exports ? this
root.foo = -> 'Hello World'
###
My comments will show up here

###
#
# Pushes an event into the system each time the function is polled
#
exports.push = () ->
    exports.pushEvent
        content: "This is an event that will be sent again and again every ten seconds"
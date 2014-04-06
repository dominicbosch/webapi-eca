#
# Pushes an event into the system each time the function is polled
#
exports.push = ( pushEvent ) ->
    pushEvent
        content: "This is an event that will be sent again and again every ten seconds"
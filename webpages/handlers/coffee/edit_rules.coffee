
fOnLoad = () ->
  document.title = 'Edit Rules'
  $( '#pagetitle' ).text "{{{user.username}}}, edit your Rules!"

  fErrHandler = ( errMsg ) ->
    ( err ) ->
      fDelayed = () ->
        if err.responseText is ''
          msg = 'No Response from Server!'
        else
          try
            oErr = JSON.parse err.responseText
            msg = oErr.message
        $( '#info' ).text errMsg + msg
        $( '#info' ).attr 'class', 'error'
      setTimeout fDelayed, 500

  fFetchRules = () ->
    $.post( '/usercommand', command: 'get_rules' )
      .done fUpdateRuleList
      .fail fErrHandler 'Did not retrieve rules! '

  fUpdateRuleList = ( data ) ->
    $( '#tableRules tr' ).remove()
    for ruleName in data.message
      tr = $ '<tr>'
      img = $( '<img>' ).attr( 'class', 'del' ).attr 'src', 'red_cross_small.png'
      imgTwo = $( '<img>' ).attr( 'class', 'log' ).attr 'src', 'logicon.png'
      inp = $( '<div>' ).text ruleName
      tr.append( $( '<td>' ).append img )
      tr.append( $( '<td>' ).append imgTwo )
      tr.append( $( '<td>' ).append inp )
      $( '#tableRules' ).append tr

  fFetchRules()

  $( '#tableRules' ).on 'click', 'img.del', () ->
    ruleName = $( 'div', $( this ).closest( 'tr' )).text()
    if confirm  "Do you really want to delete the rule '#{ ruleName }'?"
      data =
        command: 'delete_rule'
        payload:
          id: ruleName
      data.payload = JSON.stringify data.payload
      $.post( '/usercommand', data )
        .done fFetchRules
        .fail fErrHandler 'Could not delete rule! '

  $( '#tableRules' ).on 'click', 'img.log', () ->
    ruleName = $( 'div', $( this ).closest( 'tr' )).text()
    data =
      command: 'get_rule_log'
      payload:
        id: ruleName
    data.payload = JSON.stringify data.payload
    $.post( '/usercommand', data )
      .done ( data ) ->
        log = data.message.replace new RegExp("\n", 'g'), "<br>"
        $( '#log_col' ).html "<h3>#{ ruleName } Log:</h3>#{ log }"
      .fail fErrHandler 'Could not get rule log! '

window.addEventListener 'load', fOnLoad, true

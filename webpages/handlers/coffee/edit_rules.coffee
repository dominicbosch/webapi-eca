 






 # encodeURIComponent(url); -> Rule Name to be passed to forge_rule





fOnLoad = () ->
  document.title = 'Edit Rules'
  $( '#pagetitle' ).text "{{{user.username}}}, edit your Rules!"

  fErrHandler = ( errMsg ) ->
    ( err ) ->
      if err.status is 401
        window.location.href = 'forge?page=edit_rules'
      else
        $( '#log_col' ).text ""
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
      img = $( '<img>' ).attr( 'class', 'del' )
        .attr( 'title', 'Delete Rule' ).attr 'src', 'red_cross_small.png'
      tr.append( $( '<td>' ).append img )
      img = $( '<img>' ).attr( 'class', 'edit' )
        .attr( 'title', 'Edit Rule' ).attr 'src', 'edit.png'
      tr.append( $( '<td>' ).append img )
      img = $( '<img>' ).attr( 'class', 'log' )
        .attr( 'title', 'Show Rule Log' ).attr 'src', 'logicon.png'
      tr.append( $( '<td>' ).append img )
      inp = $( '<div>' ).text ruleName
      tr.append( $( '<td>' ).append inp )
      $( '#tableRules' ).append tr

  fFetchRules()

  $( '#tableRules' ).on 'click', 'img.del', () ->
    ruleName = $( 'div', $( this ).closest( 'tr' )).text()
    if confirm  "Do you really want to delete the rule '#{ ruleName }'?"
      $( '#log_col' ).text ""
      data =
        command: 'delete_rule'
        payload:
          id: ruleName
      data.payload = JSON.stringify data.payload
      $.post( '/usercommand', data )
        .done fFetchRules
        .fail fErrHandler 'Could not delete rule! '

  $( '#tableRules' ).on 'click', 'img.edit', () ->
    ruleName = $( 'div', $( this ).closest( 'tr' )).text()
    window.location.href = 'forge?page=forge_rule&id=' + encodeURIComponent ruleName

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

  # Add parameter list functionality
  fChangeInputVisibility = () ->
    $( '#tableParams tr' ).each ( id ) ->
      if $( this ).is ':last-child' or $( this ).is ':only-child'
        $( 'img', this ).hide()
        $( 'input[type=checkbox]', this ).hide()
      else
        $( 'img', this ).show()
        $( 'input[type=checkbox]', this ).show()

  $( '#tableParams' ).on 'click', 'img', () ->
    par = $( this ).closest 'tr' 
    if not par.is ':last-child'
      par.remove()
    fChangeInputVisibility()

  $( '#tableParams' ).on 'keyup', 'input', ( e ) ->
    code = e.keyCode or e.which
    if code isnt 9
      par = $( this ).closest 'tr'
      if par.is ':last-child'
        tr = $ '<tr>'
        img = $( '<img>' ).attr( 'title', 'Remove?').attr 'src', 'red_cross_small.png'
        cb = $( '<input>' ).attr( 'type', 'checkbox' ).attr 'title', 'Password shielded input?'
        inp = $( '<input>' ).attr( 'type', 'text' ).attr 'class', 'textinput'
        tr.append $( '<td>' ).append img
        tr.append $( '<td>' ).append cb
        tr.append $( '<td>' ).append inp
        par.parent().append tr
        fChangeInputVisibility()
      else if $( this ).val() is '' and not par.is ':only-child'
        par.remove()

  fChangeInputVisibility()
window.addEventListener 'load', fOnLoad, true


fOnLoad = () ->
  document.title = 'Edit Modules'
  $( '#pagetitle' ).text "{{{user.username}}}, edit your Modules!"

  moduleType = $( '#module_type' ).val()
  $( '#module_type' ).change () ->
    moduleType = $( this ).val()
    console.log moduleType
    fFetchModules()

  editor = ace.edit "editor"
  editor.setTheme "ace/theme/monokai"
  editor.setReadOnly true
  editor.setShowPrintMargin false

  fErrHandler = ( errMsg ) ->
    ( err ) ->
      $( '#moduleName' ).html "<h2>&nbsp;</h2>"
      $( '#moduleLanguage' ).html "<b>&nbsp;</b>"
      editor.setValue ""
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

  fFetchModules = () ->
    if moduleType is 'Event Poller'
      cmd = 'get_event_pollers'
    else
      cmd = 'get_action_invokers'
    $.post( '/usercommand', command: cmd )
      .done fUpdateModuleList
      .fail fErrHandler 'Did not retrieve rules! '

  fUpdateModuleList = ( data ) ->
    $( '#tableModules tr' ).remove()
    oMods = JSON.parse data.message
    for modName of oMods
      tr = $ '<tr>'
      img = $( '<img>' ).attr( 'class', 'del' ).attr 'src', 'red_cross_small.png'
      imgTwo = $( '<img>' ).attr( 'class', 'log' ).attr 'src', 'logicon.png'
      inp = $( '<div>' ).text modName
      tr.append( $( '<td>' ).append img )
      tr.append( $( '<td>' ).append imgTwo )
      tr.append( $( '<td>' ).append inp )
      $( '#tableModules' ).append tr

  fFetchModules()

  $( '#tableModules' ).on 'click', 'img.del', () ->
    modName = $( 'div', $( this ).closest( 'tr' )).text()
    if confirm  "Do you really want to delete the Module '#{ modName }'?
        The module might still be active in some of your rules!"
      $( '#moduleName' ).html "<h2>&nbsp;</h2>"
      $( '#moduleLanguage' ).html "<b>&nbsp;</b>"
      editor.setValue ""
      if moduleType is 'Event Poller'
        cmd = 'delete_event_poller'
      else
        cmd = 'delete_action_invoker'
      data =
        command: cmd
        payload:
          id: modName
      data.payload = JSON.stringify data.payload
      $.post( '/usercommand', data )
        .done fFetchModules
        .fail fErrHandler 'Could not delete module! '

  $( '#tableModules' ).on 'click', 'img.log', () ->
    modName = $( 'div', $( this ).closest( 'tr' )).text()
    if moduleType is 'Event Poller'
      cmd = 'get_full_event_poller'
    else
      cmd = 'get_full_action_invoker'
    data =
      command: cmd
      payload:
        id: modName
    data.payload = JSON.stringify data.payload
    $.post( '/usercommand', data )
      .done ( data ) ->
        try
          oMod = JSON.parse data.message
        catch err
          fErrHandler err.message
        if oMod.lang is 'CoffeeScript'
          editor.getSession().setMode "ace/mode/coffee"
        else
          editor.getSession().setMode "ace/mode/javascript"
        editor.setValue oMod.data
        editor.gotoLine 1, 1
        $( '#moduleName' ).html "<h2>#{ oMod.id }</h2>"
        $( '#moduleLanguage' ).html "<b>#{ oMod.lang }</b>"

      .fail fErrHandler 'Could not get module! '

window.addEventListener 'load', fOnLoad, true

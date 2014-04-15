strPublicKey = ''

fFailedRequest = ( msg ) ->
  ( err ) ->
    if err.status is 401
      window.location.href = 'forge?page=forge_rule'
    else
      $( '#info' ).text msg
      $( '#info' ).attr 'class', 'error'

$.post( '/usercommand', command: 'get_public_key' )
  .done ( data ) ->
    strPublicKey = data.message
  .fail ( err ) ->
    if err.status is 401
      window.location.href = 'forge?page=forge_rule'
    else
      $( '#info' ).text 'Error fetching public key, unable to send user specific parameters securely'
      $( '#info' ).attr 'class', 'error'

fOnLoad = () ->
  document.title = 'Rule Forge!'
  $( '#pagetitle' ).text '{{{user.username}}}, forge your ECA Rule!'

  editor = ace.edit "editor_conditions"
  editor.setTheme "ace/theme/monokai"
  editor.getSession().setMode "ace/mode/json"
  editor.setShowPrintMargin false
  # editor.session.setUseSoftTabs false 

  # Fetch Event Poller user-specific parameters
  fFetchEventParams = ( name ) ->
    if name
      arr = name.split ' -> '
      obj =
        command: 'get_event_poller_params'
        payload:
          id: arr[0]
      obj.payload = JSON.stringify( obj.payload );
      $.post( '/usercommand', obj )
        .done ( data ) ->
          if data.message
            oParams = JSON.parse data.message
            $( '#event_poller_params table' ).remove()
            table = $ '<table>'
            $( '#event_poller_params' ).append table
            fAppendParam = ( name, shielded ) ->
              tr = $( '<tr>' )
              tr.append $( '<td>' ).css 'width', '20px'
              tr.append $( '<td>' ).attr( 'class', 'key' ).text name
              inp = $( '<input>' ).attr 'id', "#{ name }"
              if shielded
                inp.attr( 'type', 'password' )
              tr.append $( '<td>' ).text( ' : ' ).append inp
              table.append tr
            fAppendParam name, shielded for name, shielded of oParams
        .fail fFailedRequest 'Error fetching event poller params'

  # Init Event Pollers
  $.post( '/usercommand', command: 'get_event_pollers' )
    .done ( data ) ->
      try
        oEps = JSON.parse data.message
      catch err
        console.error 'ERROR: non-object received from server: ' + data.message
        return
      
      fAppendEvents = ( id, events ) ->
        fAppendEvent = ( evt ) ->
          $( '#select_event' ).append $( '<option>' ).text id + ' -> ' + evt
        fAppendEvent evt for evt in events
      fAppendEvents id, events for id, events of oEps
      fFetchEventParams $( '#select_event option:selected' ).text()
    .fail fFailedRequest 'Error fetching event poller'

  $( '#select_event' ).change () ->
    fFetchEventParams $( this ).val()

  # Init Action Invoker
  obj =
    command: 'get_action_invokers'
  $.post( '/usercommand', obj )

    .done ( data ) ->
      try
        oAis = JSON.parse data.message
      catch err
        console.error 'ERROR: non-object received from server: ' + data.message
        return
      fAppendActions = ( module, actions ) ->
        for act in actions
          $( '#select_actions' ).append $( '<option>' ).text module + ' -> ' + act
      fAppendActions module, actions for module, actions of oAis
    .fail fFailedRequest 'Error fetching event poller'

  fFetchActionParams = ( div, modName ) ->
    obj =
      command: 'get_action_invoker_params'
      payload:
        id: modName
    obj.payload = JSON.stringify( obj.payload );
    $.post( '/usercommand', obj )
      .done ( data ) ->
        if data.message
          oParams = JSON.parse data.message
          table = $ '<table>'
          div.append table
          fAppendActionParam = ( name, shielded ) ->
            tr = $( '<tr>' )
            tr.append $( '<td>' ).css 'width', '20px'
            tr.append $( '<td>' ).attr( 'class', 'key').text name
            inp = $( '<input>' ).attr 'id', "#{ name }"
            if shielded
              inp.attr( 'type', 'password' )
            else
              inp.attr( 'type', 'text' )
            tr.append $( '<td>' ).text(' : ').append inp
            table.append tr
          fAppendActionParam name, sh for name, sh of oParams
      .fail fFailedRequest 'Error fetching action invoker params'

  fFetchActionFunctionParams = ( tag, arrName ) ->
    obj =
      command: 'get_action_invoker_function_params'
      payload:
        id: arrName[ 0 ]
    obj.payload = JSON.stringify( obj.payload );
    $.post( '/usercommand', obj )
      .done ( data ) ->
        if data.message
          oParams = JSON.parse data.message
          if oParams[ arrName[ 1 ] ]
            table = $( '<table>' ).appendTo tag
            for functionArgument in oParams[ arrName[ 1 ] ]
              tr = $( '<tr>' ).appendTo table
              td = $( '<td>' ).appendTo tr
              td.append $( '<div>' ).attr( 'class', 'funcarg' ).text functionArgument
              tr.append td
              td = $( '<td>' ).appendTo tr
              td.append $( '<input>' ).attr 'type', 'text'
              tr.append td
              tr.append td
              td = $( '<td>' ).appendTo tr
              td.append $( '<input>' ).attr( 'type', 'checkbox' )
                .attr 'title', 'js-select expression to be resolved on event?'
      .fail fFailedRequest 'Error fetching action invoker function params'

  $( '#select_actions' ).on 'change', () ->
    opt = $ 'option:selected', this
    arrName = opt.text().split ' -> '
    
    arrEls = $( "#action_params div.modName" ).map( () ->
      $( this ).text()
    ).get()
    table = $( '#selected_actions' )
    tr = $( '<tr>' ).appendTo table
    img = $( '<img>' ).attr 'src', 'red_cross_small.png'
    tr.append $( '<td>' ).css( 'width', '20px' ).append img
    tr.append $( '<td>' ).attr( 'class', 'title').text opt.val() 
    td = $( '<td>' ).attr( 'class', 'funcMappings').appendTo tr
    fFetchActionFunctionParams td, arrName
    if arrName[ 0 ] not in arrEls
      div = $( '<div>' ).appendTo $( '#action_params' )
      subdiv = $( '<div> ').appendTo div 
      subdiv.append $( '<div>' )
        .attr( 'class', 'modName underlined' ).text arrName[ 0 ]
      fFetchActionParams div, arrName[ 0 ]
    opt.remove()

  $( '#selected_actions' ).on 'click', 'img', () ->
    act = $( this ).closest( 'td' ).siblings( '.title' ).text()
    arrName = act.split ' -> '

    nMods = 0
    # Check whether we're the only function left that was selected from this module
    $( "#selected_actions td.title" ).each () ->
      arrNm = $( this ).text().split ' -> '
      nMods++ if arrNm[0] is arrName[0]
    if nMods is 1
      $('#action_params > div').each () ->
        if $( this ).children( 'div.modName' ).text() is arrName[ 0 ]
          $( this ).remove()

    opt = $( '<option>' ).text arrName[ 0 ]
    $( '#select_actions' ).append opt
    $( this ).closest( 'tr' ).remove()


  $( '#but_submit' ).click () ->
    try
      if $( '#select_event option:selected' ).length is 0
          throw new Error 'Please create an Event Poller first!'

      if $( '#input_id' ).val() is ''
        throw new Error 'Please enter a rule name!'

      ep = {}
      $( "#event_poller_params tr" ).each () ->
        val = $( 'input', this ).val()
        name = $( this ).children( '.key' ).text()
        if val is ''
          throw new Error "Please enter a value for '#{ name }' in the event module!"
        ep[name] = val

      if $( '#selected_actions tr' ).length is 0
        throw new Error 'Please select at least one action or create one!'

      # Store all selected action invokers
      ap = {}
      $( '> div', $( '#action_params' ) ).each () ->
        modName = $( '.modName', this ).text()
        params = {}
        $( 'tr', this ).each () ->
          key = $( '.key', this ).text()
          val = $( 'input', this ).val()
          if val is ''
            throw new Error "'#{ key }' missing for '#{ modName }'"
          params[key] = val
        encryptedParams = cryptico.encrypt JSON.stringify( params ), strPublicKey 
        ap[modName] = encryptedParams.cipher
      acts = []
      actParams = {}
      $( '#selected_actions' ).each () ->
        actionName = $( '.title', this ).text()
        acts.push actionName
        $( '.funcMappings tr' ).each () ->
          tmp =
            argument: $( 'div.funcarg', this ).val()
            value: $( 'input[type=text]', this ).val()
            regexp: $( 'input[type=checkbox]', this ).is( ':checked' )
          actParams[ actionName ] = cryptico.encrypt JSON.stringify( tmp ), strPublicKey
      
      try
        conds = JSON.parse editor.getValue()
      catch err
        throw new Error "Parsing of your conditions failed! Needs to be an Array of Strings!"
      
      if conds not instanceof Array
        throw new Error "Conditions Invalid! Needs to be an Array of Strings!"

      encryptedParams = cryptico.encrypt JSON.stringify( ep ), strPublicKey
      obj =
        command: 'forge_rule'
        payload:
          id: $( '#input_id' ).val()
          event: $( '#select_event option:selected' ).val()
          event_params: encryptedParams.cipher
          conditions: conds
          actions: acts
          action_params: ap
          action_functions: actParams
      obj.payload = JSON.stringify obj.payload
      window.scrollTo 0, 0
      $.post( '/usercommand', obj )
        .done ( data ) ->
          $( '#info' ).text data.message
          $( '#info' ).attr 'class', 'success'
        .fail ( err ) ->
          if err.responseText is ''
            msg = 'No Response from Server!'
          else
            try
              msg = JSON.parse( err.responseText ).message
          fFailedRequest( 'Error in upload: ' + msg ) err
    catch err
      $( '#info' ).text 'Error in upload: ' + err.message
      $( '#info' ).attr 'class', 'error'
      alert err.message

  arrParams = window.location.search.substring(1).split '&'
  id = ''
  for param in arrParams
    arrKV = param.split '='
    if arrKV[ 0 ] is 'id'
      id = decodeURIComponent arrKV[ 1 ]
  if id isnt ''
    console.log id



window.addEventListener 'load', fOnLoad, true

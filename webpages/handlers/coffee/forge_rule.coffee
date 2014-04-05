strPublicKey = ''
$.post( '/usercommand', command: 'get_public_key' )
  .done ( data ) ->
    strPublicKey = data.message
  .fail ( err ) ->
    console.log err
    $( '#info' ).text 'Error fetching public key, unable to send user-specific parameters securely'
    $( '#info' ).attr 'class', 'error'

fOnLoad = () ->

  editor = ace.edit "editor_conditions"
  editor.setTheme "ace/theme/monokai"
  editor.getSession().setMode "ace/mode/json"
  editor.setShowPrintMargin false
  # editor.session.setUseSoftTabs false 

  document.title = 'Rule Forge!'
  $( '#pagetitle' ).text '{{{user.username}}}, forge your rule!'

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
            arrParams = JSON.parse data.message
            $( '#event_poller_params table' ).remove()
            if arrParams.length > 0
              table = $ '<table>'
              $( '#event_poller_params' ).append table
              fAppendParam = ( name ) ->
                tr = $( '<tr>' )
                tr.append $( '<td>' ).css 'width', '20px'
                tr.append $( '<td>' ).attr( 'class', 'key' ).text name
                inp = $( '<input>' ).attr( 'type', 'password' ).attr 'id', "#{ name }"
                tr.append $( '<td>' ).text( ' :' ).append inp
                table.append tr
              fAppendParam name for name in arrParams
        .fail ( err ) ->
          fDelayed = () ->
            console.log err
            $( '#info' ).text 'Error fetching event poller params'
            $( '#info' ).attr 'class', 'error'
          setTimeout fDelayed, 500


#FIXME Add possibility for custom event via text input
#FIXME Add conditions
#FIXME Only send user parameters encrypted! RSA required! Crypto-js doesn't provide it


  # Init Event Pollers
  obj =
    command: 'get_event_pollers'
  $.post( '/usercommand', obj )
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
    .fail ( err ) ->
      fDelayed = () ->
        console.log err
        $( '#info' ).text 'Error fetching event poller'
        $( '#info' ).attr 'class', 'error'
      setTimeout fDelayed, 500

  $( '#select_event' ).change () ->
    fFetchEventParams $( this ).val()

  # Init Action Invoker
  arrActionInvoker = []
  obj =
    command: 'get_action_invokers'
  $.post( '/usercommand', obj )
    .done ( data ) ->
      try
        oAis = JSON.parse data.message
      catch err
        console.error 'ERROR: non-object received from server: ' + data.message
        return
      i = 0
      fAppendActions = ( id, actions ) ->
        fAppendAction = ( act ) ->
          $( '#select_actions' ).append $( '<option>' ).attr( 'id', i++ ).text id + ' -> ' + act
          arrActionInvoker.push id + ' -> ' + act
        fAppendAction act for act in actions
      fAppendActions id, actions for id, actions of oAis

    .fail ( err ) ->
      console.log err
      fDelayed = () ->
        $( '#info' ).text 'Error fetching event poller'
        $( '#info' ).attr 'class', 'error'
      setTimeout fDelayed, 500

  # Fetch Action Invoker user-specific parameters
  fFetchActionParams = ( div, name ) ->
    obj =
      command: 'get_action_invoker_params'
      payload:
        id: name
    obj.payload = JSON.stringify( obj.payload );
    $.post( '/usercommand', obj )
      .done ( data ) ->
        if data.message
          arrParams = JSON.parse data.message
          if arrParams.length > 0
            table = $ '<table>'
            div.append table
            fAppendActionParam = ( name ) ->
              tr = $( '<tr>' )
              tr.append $( '<td>' ).css 'width', '20px'
              tr.append $( '<td>' ).attr( 'class', 'key').text name
              tr.append $( '<td>' ).text(' :').append $( '<input>' ).attr( 'type', 'password' )
              table.append tr
            fAppendActionParam name for name in arrParams
      .fail ( err ) ->
        console.log err
        fDelayed = () ->
          $( '#info' ).text 'Error fetching action invoker params'
          $( '#info' ).attr 'class', 'error'
        setTimeout fDelayed, 500

  $( '#select_actions' ).on 'change', () ->
    opt = $ 'option:selected', this
    arrAI = opt.val().split ' -> '
    idAI = opt.attr 'id'

    table = $( '#selected_actions' )
    tr = $( '<tr>' ).attr( 'id', 'title_' + idAI )
    img = $( '<img>' ).attr 'src', 'red_cross_small.png'
    tr.append $( '<td>' ).css( 'width', '20px' ).append img
    tr.append $( '<td>' ).attr( 'class', 'title').text( opt.val() )
    table.append tr
    if $( '#ap_' + idAI ).length is 0
      div = $( '<div>' )
        .attr( 'id', 'ap_' + idAI )
      div.append $( '<div> ')
        .attr( 'class', 'underlined')
        .text arrAI[0]
      $( '#action_params' ).append div
      fFetchActionParams div, arrAI[0]
    opt.remove()

  $( '#selected_actions' ).on 'click', 'img', () ->
    id = $( this ).closest( 'tr' ).attr( 'id' ).substring 6
    name = arrActionInvoker[id]
    arrName = name.split ' -> '
    $( '#title_' + id ).remove()
    $( '#params_' + id ).remove()
    opt = $( '<option>' ).attr( 'id', id ).text name
    $( '#select_actions' ).append opt
    $( '#ap_' + id ).remove()


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
        id = $( this ).attr( 'id' ).substring 3
        params = {}
        $( 'tr', this ).each () ->
          key = $( '.key', this ).text()
          val = $( 'input', this ).val()
          if val is ''
            throw new Error "'#{ key }' missing for '#{ id }'"
          params[key] = val
        encryptedParams = cryptico.encrypt JSON.stringify( params ), strPublicKey 
        ap[id] = encryptedParams.cipher
      acts = []
      $( '#selected_actions .title' ).each () ->
        acts.push $( this ).text()

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
      obj.payload = JSON.stringify obj.payload
      $.post( '/usercommand', obj )
        .done ( data ) ->
          $( '#info' ).text data.message
          $( '#info' ).attr 'class', 'success'
        .fail ( err ) ->
          fDelayed = () ->
            if err.responseText is ''
              msg = 'No Response from Server!'
            else
              try
                oErr = JSON.parse err.responseText
                msg = oErr.message
            $( '#info' ).text 'Error in upload: ' + msg
            $( '#info' ).attr 'class', 'error'
            if err.status is 401
              window.location.href = 'forge?page=forge_rule'
          setTimeout fDelayed, 500
    catch err
      $( '#info' ).text 'Error in upload: ' + err.message
      $( '#info' ).attr 'class', 'error'
      alert err.message
window.addEventListener 'load', fOnLoad, true

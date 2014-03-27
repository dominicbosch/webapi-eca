
fOnLoad = () ->
  document.title = 'Forge Action Invoker'
  $( '#pagetitle' ).text "{{{user.username}}}, forge your custom action invoker!"

  # Setup the ACE editor
  editor = ace.edit "editor"
  editor.setTheme "ace/theme/monokai"
  editor.getSession().setMode "ace/mode/coffee"
  editor.setShowPrintMargin false
  
  $( '#editor_mode' ).change ( el ) ->
    if $( this ).val() is '0'
      editor.getSession().setMode "ace/mode/coffee"
    else 
      editor.getSession().setMode "ace/mode/javascript"
  
  # Add parameter list functionality
  fChangeCrosses = () ->
    $( '#tableParams img' ).each ( id ) ->
      par = $( this ).closest 'tr'
      if par.is ':last-child' or par.is ':only-child'
        $( this ).hide()
      else
        $( this ).show()  

  $( '#tableParams' ).on 'click', 'img', () ->
    par = $( this ).closest 'tr' 
    if not par.is ':last-child'
      par.remove()
    fChangeCrosses()

  $( '#tableParams' ).on 'keyup', 'input', () ->
    par = $( this ).closest( 'tr' )
    if par.is ':last-child'
      tr = $ '<tr>'
      img = $( '<img>' ).attr 'src', 'red_cross_small.png'
      inp = $( '<input>' ).attr 'type', 'text'
      tr.append( $( '<td>' ).append img )
      tr.append( $( '<td>' ).append inp )
      par.parent().append tr
      fChangeCrosses()
    else if $( this ).val() is '' and not par.is ':only-child'
      par.remove()
  fChangeCrosses()

  # Add submit button logic
  $( '#but_submit' ).click () ->
    if $( '#input_id' ).val() is ''
      alert 'Please enter an action invoker name!'
    else
      listParams = []
      $( '#tableParams input' ).each () ->
        val =  $( this ).val()
        if val isnt ""
          listParams.push val
      obj =
        command: 'forge_action_invoker'
        payload:
          id: $( '#input_id' ).val()
          lang: $( '#editor_mode' ).val()
          public: $( '#is_public' ).is ':checked'
          data: editor.getValue()
          params: JSON.stringify listParams
      $.post( '/usercommand', obj )
        .done ( data ) ->
          $( '#info' ).text data.message
          $( '#info' ).attr 'class', 'success'
        .fail ( err ) ->
          if err.responseText is ''
            msg = 'No Response from Server!'
          else
            try
              oErr = JSON.parse err.responseText
              msg = oErr.message
          $( '#info' ).text 'Action Invoker not stored! ' + msg
          $( '#info' ).attr 'class', 'error'
          if err.status is 401
            window.location.href = 'forge?page=forge_action_invoker'

window.addEventListener 'load', fOnLoad, true

#   "ais": {
#     "ai1": {
#       "code": "
#       url = 'https://api.emailyak.com/v1/' + params.apikey + '/json/send/email/'
      
# exports.sendMail = ( args ) ->
#     data:
#         FromAddress: "no-reply@mscliveweb.simpleyak.com"
#         ToAddress: "test@mscliveweb.simpleyak.com"
#     log 'set data, posting now'
# needle.post url, data, ( err, resp, body ) ->
#     log 'post returned'
#     if not err and resp.statusCode is 200
#         log 'Sent mail...'
#     else
#         log 'Error in EmailYak EM sendMail: ' + err.message
#       "

#     }
#   },

fOnLoad = () ->
  document.title = 'Administrate'
  $( '#pagetitle' ).text 'Hi {{{user.username}}}, issue your commands please:'
  $( '#but_submit' ).click () ->
    data = 
      command: $( '#inp_command' ).val()
    $.post( 'admincommand', data )
      .done ( data ) ->
        $( '#info' ).text data.message
        $( '#info' ).attr 'class', 'success'
      .fail ( err ) ->
        fDelayed = () ->
          if err.responseText is ''
            err.responseText = 'No Response from Server!'
          $( '#info' ).text 'Error: ' + err.responseText
          $( '#info' ).attr 'class', 'error'
          if err.status is 401
            window.location.href = 'admin'
        setTimeout fDelayed, 500

window.addEventListener 'load', fOnLoad, true

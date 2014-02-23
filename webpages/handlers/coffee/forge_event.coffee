

fOnLoad = () ->
  document.title = 'Event Forge!'
  $( '#pagetitle' ).text 'Invoke your custom event!'

  editor = ace.edit "editor"
  editor.setTheme "ace/theme/monokai"
  editor.getSession().setMode "ace/mode/json"
  editor.setShowPrintMargin false
  $( '#editor' ).css 'height', '400px'
  $( '#editor' ).css 'width', '600px'
  
  $( '#but_submit' ).click () ->
    try
      data = JSON.parse editor.getValue()
      $.post( '/event', data )
        .done ( data ) ->
          $( '#info' ).text data.message
          $( '#info' ).attr 'class', 'success'
        .fail ( err ) ->
          if err.responseText is ''
            err.responseText = 'No Response from Server!'
          $( '#info' ).text 'Error in upload: ' + err.responseText
          $( '#info' ).attr 'class', 'error'
          if err.status is 401
            window.location.href = 'forge?page=forge_event'
    catch err
      $( '#info' ).text 'You have errors in your JSON object! ' + err
      $( '#info' ).attr 'class', 'error'
     
window.addEventListener 'load', fOnLoad, true

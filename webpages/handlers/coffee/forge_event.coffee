

fOnLoad = () ->
  document.title = 'Event Forge!'
  $( '#pagetitle' ).text 'Invoke your custom event!'

  editor = ace.edit "editor"
  editor.setTheme "ace/theme/monokai"
  editor.getSession().setMode "ace/mode/json"
  editor.setShowPrintMargin false
  
  $('#but_submit').click () ->
    try
      data = JSON.parse editor.getValue()
      $.post('/event', data)
        .done ( data ) ->
          alert data
        .fail (err) ->
          alert 'Posting of event failed: ' + err.responseText
    catch err
      alert 'You have errors in your JSON object!'
     
window.addEventListener 'load', fOnLoad, true

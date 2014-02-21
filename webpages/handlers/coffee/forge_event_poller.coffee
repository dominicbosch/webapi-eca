

fOnLoad = () ->
  document.title = 'Forge Event Poller'
  $( '#pagetitle' ).text 'Forge your custom event poller!'

  editor = ace.edit "editor"
  editor.setTheme "ace/theme/monokai"
  editor.getSession().setMode "ace/mode/coffee"
  editor.setShowPrintMargin false
  
  $( '#editor_mode' ).change ( el ) ->
    if $( this ).val() is '0'
      editor.getSession().setMode "ace/mode/coffee"
    else 
      editor.getSession().setMode "ace/mode/javascript"

  $( '#but_submit' ).click () ->
    try
      data = JSON.parse editor.getValue()
      $.post('/event', data)
        .done ( data ) ->
          alert data
        .fail (err) ->
          alert 'Posting of event failed: ' + err.responseText
    catch err
      alert 'You have errors in your JSON object!'
  
  fChangeCrosses = () ->
    $( '#listParams img' ).each ( id ) ->
      par = $( this ).parent 'tr'
      if par.is ':last-child' or par.is ':only-child'
        $( this ).hide()
      else
        $( this ).show()  

  $( '#listParams' ).on 'click', 'img', () ->
    par = $( this ).parent 'tr' 
    if not par.is ':last-child'
      par.remove()
    fChangeCrosses()

  $( '#listParams' ).on 'keyup', 'input', ->
    console.log 'weees'
    if $( this ).parent( 'tr' ).is ':last-child'
      tr = $ '<tr>'
      td = tr.append 'td' 
      td.append $( '<img>' ).attr 'src', 'red_cross_small.png' 
      td.append $( '<input>' ).attr 'type', 'text' 
      $( '#listParams' ).append tr
      fChangeCrosses()
  fChangeCrosses()

window.addEventListener 'load', fOnLoad, true

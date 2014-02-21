
fOnLoad = () ->
  document.title = 'Error!'
  $( '#pagetitle' ).text 'Error processing your request!'
  $( '#pagetitle' ).attr 'class', 'error'

window.addEventListener 'load', fOnLoad, true

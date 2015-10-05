'use strict';
var fOnLoad;

fOnLoad = function() {
  document.title = 'Error!';
  $('#pagetitle').text('Hi {{{user.username}}}, there has been an error!');
  $('#info').text('Error: {{{message}}}');
  return $('#info').attr('class', 'error');
};

window.addEventListener('load', fOnLoad, true);

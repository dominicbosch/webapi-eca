$(document).ready(function() {
  var elSelected, els, url;
  url = window.location.href;
  els = $('ul.nav a').filter(function() {
    return this.href === url;
  });
  elSelected = $('<span>').attr('class', 'sr-only').text('(current)');
  return els.append(elSelected).parent().addClass('active');
});

window.main = {
  setInfo: function(isSuccess, msg) {
    $('#info').text(msg);
    return $('#info').attr('class', isSuccess ? 'success' : 'error');
  },
  clearInfo: function() {
    $('#info').text('');
    return $('#info').attr('class', '');
  }
};

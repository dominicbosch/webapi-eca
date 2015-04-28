var hoverIn, hoverOut;

$(document).ready(function() {
  var elSelected, els, url;
  url = window.location.href;
  els = $('ul.nav a').filter(function() {
    return this.href === url;
  });
  elSelected = $('<span>').attr('class', 'sr-only').text('(current)');
  return els.append(elSelected).parent().addClass('active');
});

hoverIn = function(html) {
  return function(e) {
    return $('#tooltip').html(html).fadeIn().css('top', e.target.offsetTop + e.target.height).css('left', e.target.offsetLeft + e.target.width / 2);
  };
};

hoverOut = function(e) {
  return $('#tooltip').fadeOut();
};

window.main = {
  setInfo: function(isSuccess, msg) {
    $('#info').text(msg);
    $('#info').attr('class', isSuccess ? 'success' : 'error');
    return window.scrollTo(0, 0);
  },
  clearInfo: function() {
    $('#info').text('');
    return $('#info').attr('class', '');
  },
  registerHoverInfo: function(el, file) {
    return $.get('/help/' + file, function(html) {
      var info;
      info = $('<img>').attr('src', '/images/info.png').attr('class', 'infoimg').hover(hoverIn(html), hoverOut);
      return el.append(info);
    });
  }
};

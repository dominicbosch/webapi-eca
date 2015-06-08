'use strict';
var hoverIn, hoverOut;

$(document).ready(function() {
  var elSelected, els, url;
  url = window.location.href;
  els = $('ul.nav a').filter(function() {
    return this.href === url;
  });
  elSelected = $('<span>').attr('class', 'sr-only').text('(current)');
  els.append(elSelected).parent().addClass('active');
  return $('#skeletonLogout').click(function() {
    return $.post('/service/session/logout', function() {
      var redirect;
      main.setInfo(true, 'Goodbye!');
      redirect = function() {
        return window.location.href = '/';
      };
      return setTimeout(redirect, 500);
    });
  });
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
    $('#skeletonTicker').text(msg);
    $('#skeletonTicker').attr('class', isSuccess ? 'success' : 'error');
    return window.scrollTo(0, 0);
  },
  clearInfo: function() {
    $('#skeletonTicker').text('');
    return $('#skeletonTicker').attr('class', '');
  },
  registerHoverInfo: function(el, file) {
    return $.get('/help/' + file, function(html) {
      var info;
      info = $('<img>').attr('src', '/images/info.png').attr('class', 'infoimg').hover(hoverIn(html), hoverOut);
      return el.append(info);
    });
  }
};

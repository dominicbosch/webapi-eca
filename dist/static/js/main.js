'use strict';
var arrKV, arrParams, i, len, oParams, param;

arrParams = window.location.search.substring(1).split('&');

oParams = {};

for (i = 0, len = arrParams.length; i < len; i++) {
  param = arrParams[i];
  arrKV = param.split('=');
  oParams[arrKV[0]] = arrKV[1];
}

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
    var hoverOut;
    hoverOut = function() {
      var checkHover;
      $(this).removeClass('hovered');
      checkHover = function() {
        if (!$('#tooltip').hasClass('hovered') && !el.hasClass('hovered')) {
          return $('#tooltip').fadeOut();
        }
      };
      return setTimeout(checkHover, 0);
    };
    return $.get('/help/' + file, function(html) {
      var info;
      info = $('<img>').attr('src', '/images/info.png').attr('class', 'infoimg').mouseleave(hoverOut).mouseenter(function(e) {
        $(this).addClass('hovered');
        return $('#tooltip').html(html).css('top', e.target.offsetTop + e.target.height - 20).css('left', e.target.offsetLeft + (e.target.width / 2) - 20).fadeIn().mouseleave(hoverOut).mouseenter(function() {
          return $(this).addClass('hovered');
        });
      });
      return el.append(info);
    });
  }
};

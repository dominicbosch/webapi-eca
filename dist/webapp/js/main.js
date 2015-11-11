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
  requestError: function(cb) {
    return function(err) {
      if (err.status === 401) {
        return window.location.href = "/";
      } else {
        return cb(err);
      }
    };
  },
  setInfo: function(isSuccess, msg) {
    d3.select('#skeletonTicker').classed('success', isSuccess).classed('error', !isSuccess).text(msg);
    return window.scrollTo(0, 0);
  },
  clearInfo: function() {
    return d3.select('#skeletonTicker').classed('success', false).classed('error', false).text('');
  },
  registerHoverInfoHTML: function(d3El, html) {
    var hoverOut;
    hoverOut = function() {
      var checkHover;
      d3.select(this).classed('hovered', false);
      checkHover = function() {
        if (!d3.select('#tooltip').classed('hovered') && !d3El.classed('hovered')) {
          return d3.select('#tooltip').transition().style('opacity', 0);
        }
      };
      return setTimeout(checkHover, 0);
    };
    return d3El.append('img').classed('infoimg', true).on('mouseleave', hoverOut).on('mouseenter', function() {
      var et;
      et = d3.event.target.getBoundingClientRect();
      d3.select(this).classed('hovered', true);
      return d3.select('#tooltip').html(html).style({
        top: (et.top + et.height - 20) + 'px',
        left: (et.left + (et.width / 2) - 20) + 'px',
        opacity: 1
      }).on('mouseleave', hoverOut).on('mouseenter', function() {
        return d3.select('#tooltip').classed('hovered', true);
      }).transition().style('opacity', 1);
    });
  },
  registerHoverInfo: function(el, file) {
    return $.get('/help/' + file, function(html) {
      return main.registerHoverInfoHTML(el, html);
    });
  }
};

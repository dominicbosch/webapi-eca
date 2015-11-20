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
    return main.post('/service/session/logout').done(function() {
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
  post: function(url, obj) {
    main.clearInfo();
    obj = obj ? JSON.stringify(obj) : void 0;
    return $.ajax({
      type: 'POST',
      url: url,
      data: obj,
      contentType: 'application/json'
    }).fail(function(err) {
      if (err.status === 401) {
        return window.location.href = '/views/login';
      }
    });
  },
  setInfo: function(isSuccess, msg) {
    d3.select('#skeletonTicker').classed('success', isSuccess).classed('error', !isSuccess).text(msg);
    return window.scrollTo(0, 0);
  },
  clearInfo: function() {
    return d3.select('#skeletonTicker').classed('success', false).classed('error', false).text('');
  },
  registerHoverInfoHTML: function(d3El, html) {
    var checkLeave, d3Div, d3Img;
    checkLeave = function() {
      if (!d3Div.classed('hovered') && !d3Img.classed('hovered')) {
        return d3Div.transition().style('opacity', 0).each('end', function() {
          return d3Div.style('visibility', 'hidden');
        });
      }
    };
    d3Img = d3El.append('img').classed('info icon', true).attr('src', '/images/info.png').on('mouseenter', function() {
      d3Img.classed('hovered', true);
      return d3Div.style('visibility', 'visible').transition().style('opacity', 1);
    }).on('mouseleave', function() {
      d3Img.classed('hovered', false);
      return setTimeout(checkLeave, 0);
    });
    return d3Div = d3El.append('span').classed('mytooltip', true).append('div').on('mouseenter', function() {
      return d3Div.classed('hovered', true);
    }).on('mouseleave', function() {
      d3Div.classed('hovered', false);
      return setTimeout(checkLeave, 0);
    }).html(html);
  },
  registerHoverInfo: function(el, file) {
    return $.get('/help/' + file, function(html) {
      return main.registerHoverInfoHTML(el, html);
    });
  }
};

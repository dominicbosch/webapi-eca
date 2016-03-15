'use strict';
var arrAllFunctions, arrSelectedFunctions, isEventTrigger, removeFunction, strPublicKey, updateParameterList;

isEventTrigger = false;

strPublicKey = '';

arrAllFunctions = null;

arrSelectedFunctions = [];

updateParameterList = function() {
  var d3New, d3Rows, dModule, funcParams, funcs, newFuncs, title, visibility;
  visibility = arrSelectedFunctions.length > 0 ? 'visible' : 'hidden';
  d3.select('#selectedFunctions').style('visibility', visibility);
  d3Rows = d3.select('#selectedFunctions').selectAll('.firstlevel').data(arrSelectedFunctions, function(d) {
    return d.id;
  });
  d3Rows.exit().transition().style('opacity', 0).remove();
  d3New = d3Rows.enter().append('div').attr('class', function(d) {
    return 'row firstlevel flid' + d.id;
  });
  dModule = d3New.append('div').attr('class', 'col-sm-6');
  dModule.append('h4').text(function(d) {
    return d.name;
  });
  dModule.each(function(d) {
    var encrypted, key, nd, ref, results;
    ref = d.globals;
    results = [];
    for (key in ref) {
      encrypted = ref[key];
      nd = d3.select(this).append('div').attr('class', 'row glob');
      nd.append('div').attr('class', 'col-xs-3 key').text(key);
      results.push(nd.append('div').attr('class', 'col-xs-9 val').append('input').attr('class', 'inp_' + key).attr('type', encrypted ? 'password' : 'text').on('change', function() {
        return d3.select(this).attr('changed', 'yes');
      }));
    }
    return results;
  });
  funcs = d3Rows.selectAll('.functions').data(function(d) {
    return d.arr;
  });
  funcs.exit().transition().style('opacity', 0).remove();
  newFuncs = funcs.enter().append('div').attr('data-fid', function(d, i) {
    return i;
  }).attr('class', function(d, i) {
    return 'functions col-sm-6 fid' + i;
  }).append('div').attr('class', 'row');
  title = newFuncs.append('div').attr('class', 'col-sm-12');
  title.append('img').attr('src', '/images/del.png').attr('class', 'icon del').on('click', removeFunction);
  title.append('span').text(function(d) {
    return d.name;
  });
  funcParams = newFuncs.selectAll('.notexisting').data(function(d) {
    return d.args;
  }).enter().append('div').attr('class', 'col-sm-12 arg').append('div').attr('class', 'row');
  funcParams.append('div').attr('class', 'col-xs-3 key').text(function(d) {
    return d;
  });
  return funcParams.append('div').attr('class', 'col-xs-9 val').append('input').attr('type', 'text').attr('class', function(d) {
    return 'arg_' + d;
  });
};

removeFunction = function(d) {
  var arrSel, d3t, id;
  d3t = d3.select(this);
  arrSel = arrSelectedFunctions.filter(function(o) {
    return o.id === d.modid;
  })[0];
  id = arrSel.arr.map(function(o) {
    return o.funcid;
  }).indexOf(d.funcid);
  arrSel.arr.splice(id, 1);
  if (arrSel.arr.length === 0) {
    id = arrSelectedFunctions.map(function(o) {
      return o.id;
    }).indexOf(d.modid);
    arrSelectedFunctions.splice(id, 1);
  }
  return updateParameterList();
};

window.functions = {
  init: function(isET, pubkey) {
    var name;
    strPublicKey = pubkey;
    isEventTrigger = isET;
    if (isEventTrigger) {
      name = 'Event Trigger';
    } else {
      name = 'Action';
    }
    return d3.select('#functionList').html("<h3>Available " + name + "s</h3>\n<table class=\"mystyle\">\n	<thead><tr>\n		<th>Module</th>\n		<th>Owner</th>\n		<th>" + name + " Function</th>\n	</tr></thead>\n	<tbody></tbody>\n</table>");
  },
  fillList: function(arr, name) {
    var d3row, d3sel;
    arrAllFunctions = arr;
    if (arr.length > 0) {
      d3.select('#functionEmpty').style('display', 'none');
      d3.select('#functionList').style('visibility', 'visible').select('tbody').selectAll('tr').data(arr, function(d) {
        return d != null ? d.id : void 0;
      }).enter().append('tr').each(function(oMod) {
        var d3This, func, list, results, trNew;
        d3This = d3.select(this);
        main.registerHoverInfoHTML(d3This.append('td').text(oMod.name), oMod.comment);
        d3This.append('td').text(function(d) {
          return d.User.username;
        });
        list = d3This.append('td').append('table');
        results = [];
        for (func in oMod.functions) {
          trNew = list.append('tr');
          trNew.append('td').append('button').text(isEventTrigger ? 'select' : 'add').attr('onclick', 'functions.add(' + oMod.id + ', "' + func + '")');
          results.push(trNew.append('td').text(func));
        }
        return results;
      });
      d3sel = d3.select('#actionSection table');
      d3row = d3sel.selectAll('tr').data(arr).enter().append('tr');
      d3row.append('td').text(function(d) {
        return d.name;
      });
      return d3row.append('td');
    }
  },
  fillExisting: function(arr) {
    var func, j, k, key, len, len1, oFunc, ref, ref1, results, val;
    results = [];
    for (j = 0, len = arr.length; j < len; j++) {
      oFunc = arr[j];
      ref = oFunc.functions;
      for (k = 0, len1 = ref.length; k < len1; k++) {
        func = ref[k];
        functions.add(oFunc.id, func.name);
        ref1 = func.args;
        for (key in ref1) {
          val = ref1[key];
          d3.select('.flid' + oFunc.id + ' .fid' + func.fid + ' .arg_' + key).node().value = val;
        }
      }
      results.push((function() {
        var ref2, results1;
        ref2 = oFunc.globals;
        results1 = [];
        for (key in ref2) {
          val = ref2[key];
          results1.push(d3.select('.flid' + oFunc.id + ' .inp_' + key).node().value = val);
        }
        return results1;
      })());
    }
    return results;
  },
  add: function(id, funcName) {
    var oAd, oSelMod;
    if (isEventTrigger) {
      arrSelectedFunctions = [];
      d3.select('#selectedFunctions .firstlevel').remove();
    }
    oSelMod = arrSelectedFunctions.filter(function(o) {
      return o.id === id;
    })[0];
    if (!oSelMod) {
      oAd = arrAllFunctions.filter(function(d) {
        return d.id === id;
      })[0];
      oSelMod = {
        id: oAd.id,
        currid: 0,
        name: oAd.name,
        globals: oAd.globals,
        functions: oAd.functions,
        arr: []
      };
      arrSelectedFunctions.push(oSelMod);
    }
    oSelMod.arr.push({
      name: funcName,
      modid: oSelMod.id,
      funcid: oSelMod.currid++,
      args: oSelMod.functions[funcName]
    });
    return updateParameterList();
  },
  getSelected: function() {
    var arrFunctions;
    arrFunctions = [];
    d3.selectAll('.firstlevel').each(function(oModule) {
      var d3module, oFunction;
      oFunction = {
        id: oModule.id,
        globals: {},
        functions: []
      };
      d3module = d3.select(this);
      d3module.selectAll('.glob').each(function() {
        var d3t, d3val, key, val;
        d3t = d3.select(this);
        key = d3t.select('.key').text();
        d3val = d3t.select('.val input');
        val = d3val.node().value;
        if (val === '') {
          d3val.node().focus();
          throw new Error('Please enter a value in all requested fields!');
        }
        if (oModule.globals[key] && d3val.attr('changed') === 'yes') {
          val = cryptico.encrypt(val, strPublicKey).cipher;
        }
        return oFunction.globals[key] = val;
      });
      d3module.selectAll('.functions').each(function(dFunc) {
        var d3This, d3arg, func;
        d3This = d3.select(this);
        func = {
          fid: d3This.attr('data-fid'),
          name: dFunc.name,
          args: {}
        };
        d3arg = d3This.selectAll('.arg').each(function(d) {
          var val;
          d3arg = d3.select(this);
          val = d3arg.select('.val input').node().value;
          if (val === '') {
            d3arg.node().focus();
            throw new Error('Please enter a value in all requested fields!');
          }
          return func.args[d] = val;
        });
        return oFunction.functions.push(func);
      });
      return arrFunctions.push(oFunction);
    });
    return arrFunctions;
  }
};

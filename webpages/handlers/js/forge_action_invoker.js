// Generated by CoffeeScript 1.7.1
(function() {
  var fOnLoad;

  fOnLoad = function() {
    var arrKV, arrParams, editor, fChangeInputVisibility, id, param, _i, _len;
    document.title = 'Forge Action Invoker';
    $('#pagetitle').text("{{{user.username}}}, forge your custom action invoker!");
    editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/coffee");
    editor.setShowPrintMargin(false);
    editor.session.setUseSoftTabs(false);
    $('#editor_mode').change(function(el) {
      if ($(this).val() === 'CoffeeScript') {
        return editor.getSession().setMode("ace/mode/coffee");
      } else {
        return editor.getSession().setMode("ace/mode/javascript");
      }
    });
    fChangeInputVisibility = function() {
      return $('#tableParams tr').each(function(id) {
        if ($(this).is(':last-child' || $(this).is(':only-child'))) {
          $('img', this).hide();
          return $('input[type=checkbox]', this).hide();
        } else {
          $('img', this).show();
          return $('input[type=checkbox]', this).show();
        }
      });
    };
    $('#tableParams').on('click', 'img', function() {
      var par;
      par = $(this).closest('tr');
      if (!par.is(':last-child')) {
        par.remove();
      }
      return fChangeInputVisibility();
    });
    $('#tableParams').on('keyup', 'input', function(e) {
      var cb, code, img, inp, par, tr;
      code = e.keyCode || e.which;
      if (code !== 9) {
        par = $(this).closest('tr');
        if (par.is(':last-child')) {
          tr = $('<tr>');
          img = $('<img>').attr('title', 'Remove?').attr('src', 'red_cross_small.png');
          cb = $('<input>').attr('type', 'checkbox').attr('title', 'Password shielded input?');
          inp = $('<input>').attr('type', 'text').attr('class', 'textinput');
          tr.append($('<td>').append(img));
          tr.append($('<td>').append(cb));
          tr.append($('<td>').append(inp));
          par.parent().append(tr);
          return fChangeInputVisibility();
        } else if ($(this).val() === '' && !par.is(':only-child')) {
          return par.remove();
        }
      }
    });
    fChangeInputVisibility();
    $('#but_submit').click(function() {
      var listParams, obj;
      if ($('#input_id').val() === '') {
        return alert('Please enter an action invoker name!');
      } else {
        listParams = {};
        $('#tableParams tr').each(function() {
          var shld, val;
          val = $('input.textinput', this).val();
          shld = $('input[type=checkbox]', this).is(':checked');
          if (val !== "") {
            listParams[val] = shld;
          }
          return true;
        });
        obj = {
          command: 'forge_action_invoker',
          payload: {
            id: $('#input_id').val(),
            lang: $('#editor_mode').val(),
            "public": $('#is_public').is(':checked'),
            data: editor.getValue(),
            params: JSON.stringify(listParams)
          }
        };
        obj.payload = JSON.stringify(obj.payload);
        window.scrollTo(0, 0);
        return $.post('/usercommand', obj).done(function(data) {
          $('#info').text(data.message);
          return $('#info').attr('class', 'success');
        }).fail(function(err) {
          var fDelayed;
          if (err.status === 401) {
            return window.location.href = 'forge?page=forge_action_invoker';
          } else {
            fDelayed = function() {
              var msg, oErr;
              if (err.responseText === '') {
                msg = 'No Response from Server!';
              } else {
                try {
                  oErr = JSON.parse(err.responseText);
                  msg = oErr.message;
                } catch (_error) {}
              }
              $('#info').text('Action Invoker not stored! ' + msg);
              return $('#info').attr('class', 'error');
            };
            return setTimeout(fDelayed, 500);
          }
        });
      }
    });
    arrParams = window.location.search.substring(1).split('&');
    id = '';
    for (_i = 0, _len = arrParams.length; _i < _len; _i++) {
      param = arrParams[_i];
      arrKV = param.split('=');
      if (arrKV[0] === 'id') {
        id = decodeURIComponent(arrKV[1]);
      }
    }
    if (id !== '') {
      return console.log(id);
    }
  };

  window.addEventListener('load', fOnLoad, true);

}).call(this);

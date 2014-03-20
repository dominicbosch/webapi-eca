// Generated by CoffeeScript 1.6.3
(function() {
  var fOnLoad;

  fOnLoad = function() {
    var editor, fChangeCrosses;
    document.title = 'Forge Action Invoker';
    $('#pagetitle').text("{{{user.username}}}, forge your custom action invoker!");
    editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/coffee");
    editor.setShowPrintMargin(false);
    $('#editor_mode').change(function(el) {
      if ($(this).val() === '0') {
        return editor.getSession().setMode("ace/mode/coffee");
      } else {
        return editor.getSession().setMode("ace/mode/javascript");
      }
    });
    fChangeCrosses = function() {
      return $('#tableParams img').each(function(id) {
        var par;
        par = $(this).closest('tr');
        if (par.is(':last-child' || par.is(':only-child'))) {
          return $(this).hide();
        } else {
          return $(this).show();
        }
      });
    };
    $('#tableParams').on('click', 'img', function() {
      var par;
      par = $(this).closest('tr');
      if (!par.is(':last-child')) {
        par.remove();
      }
      return fChangeCrosses();
    });
    $('#tableParams').on('keyup', 'input', function() {
      var img, inp, par, tr;
      par = $(this).closest('tr');
      if (par.is(':last-child')) {
        tr = $('<tr>');
        img = $('<img>').attr('src', 'red_cross_small.png');
        inp = $('<input>').attr('type', 'text');
        tr.append($('<td>').append(img));
        tr.append($('<td>').append(inp));
        par.parent().append(tr);
        return fChangeCrosses();
      } else if ($(this).val() === '' && !par.is(':only-child')) {
        return par.remove();
      }
    });
    fChangeCrosses();
    return $('#but_submit').click(function() {
      var listParams, obj;
      if ($('#input_id').val() === '') {
        return alert('Please enter an action invoker name!');
      } else {
        listParams = [];
        $('#tableParams input').each(function() {
          var val;
          val = $(this).val();
          if (val !== "") {
            return listParams.push(val);
          }
        });
        obj = {
          id: $('#input_id').val(),
          command: 'forge_action_invoker',
          lang: $('#editor_mode').val(),
          "public": $('#is_public').is(':checked'),
          data: editor.getValue(),
          params: JSON.stringify(listParams)
        };
        return $.post('/usercommand', obj).done(function(data) {
          $('#info').text(data.message);
          return $('#info').attr('class', 'success');
        }).fail(function(err) {
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
          $('#info').attr('class', 'error');
          if (err.status === 401) {
            return window.location.href = 'forge?page=forge_action_invoker';
          }
        });
      }
    });
  };

  window.addEventListener('load', fOnLoad, true);

}).call(this);


function makeOutsourceWidget(sendRequest, options) {
  
  var outsourceWidget = {};
  
  var dialogContainer;
  var lineNo;
  var reqTxt;
  var button;
  
  outsourceWidget.createRequest = function(selection) {
    _close();
    _init(selection);
    _show();
  };
  
  function _init(selection) {
    var details = $("<div id='outsource-details' />")
      .append("<input type='radio' id='outsource-mode' checked='checked' />")
      .append("<label for='outsource-mode'>Direct editing &amp; automatic integration</label>");
    
    dialogContainer = $("<div id='outsource-container' />")
      .append($("<input id='outsource-file' type='text' disabled='disabled' />").val(clientVars.editorFile))
      .append("<label for='outsource-line'>line</label>")
      .append(lineNo = $("<input id='outsource-line' type='text' />").val(selection.start[0]+1))
      .append(reqTxt = $("<textarea id='outsource-request'>Details...</textarea>"))
      .append(details)
      .append($("<button id='outsource-cancel' type='button'>Cancel</button>").click(_close))
      .append(button = $("<button id='outsource-next' type='button'>Outsource</button>").click(_makeRequest));
    
    lineNo.keyup(_handleKeys);
    reqTxt.keyup(_handleKeys);
    
    reqTxt.data('default', reqTxt.val())
      .css('color', 'gray')
      .focus(function() {
        if ( ! reqTxt.data('edited')) { reqTxt.val(''); }
        reqTxt.css('color', '');
      })
      .change(function() {
        reqTxt.data('edited', reqTxt.val() != '');
        button.attr('disabled', reqTxt.val() == '');
      })
      .keyup(function() {
        button.attr('disabled', reqTxt.val() == '');
      })
      .blur(function() {
        if ( ! reqTxt.data('edited')) {
          reqTxt.val(reqTxt.data('default'));
          reqTxt.css('color', 'gray');
        }
      })
      .val(selection.text.replace(/^\s+|\s+$/gm, '')).change();
  }
  
  function _show() {
    $("#editorcontainerbox").append(dialogContainer);
    $("label", dialogContainer).css('font-family', lineNo.css('font-family'));
    reqTxt.focus().select();
  }
  
  function _handleKeys(evt) {
    if (evt.keyCode == 27) { // escape key
      _close();
    }
  }
  
  function _close() {
    $("#outsource-container").remove();
  }
  
  function _makeRequest() {
    sendRequest({ lineNo: lineNo.val(), reqTxt: reqTxt.val() });
    _close();
  }
  
  var statusContainer = $('#outsourcedcontainer');
  var nodes = {};
  
  outsourceWidget.updateRequests = function(requests) {
    $.each(requests, function(idx, req) {
      if (req.id in nodes) {
        nodes[req.id].remove();
      }
      var node = nodes[req.id] = $('<div>');
      node.addClass('outsrcreq');
      node.addClass(req.state);
      var worker = $('<div class="reqworker">');
      var avatar = $('<div class="reqavatar">');
      worker.append(avatar);
      if (req.user) {
        worker.append($('<div>').text(req.user.userName));
        avatar.css('background-color', options.colorPalette[req.user.userColorId]);
      } else if (req.state == 'new') {
        avatar.css('background-color', '#fff');
      }
      node.append(worker);
      var location = $('<div class="reqdetail">');
      if (req.location) {
        var filename = req.location.substring(req.location.lastIndexOf('/')+1);
        location.append($('<a href="' + req.location + '">').text(filename))
      } else {
        location.html('<i>unknown</i>');
      }
      node.append(location);
      node.append($('<div class="reqdetail">').text(req.description));
      statusContainer.append(node);
    });
  };
  
  return outsourceWidget;
}

$(document).ready(function() { // on task framing page
  $('#task #done').bind('click', function() {
    $.ajax({ type: 'POST' });
    return true;
  });
});
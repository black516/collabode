// Fix for IE 8 (It doesn't have Array.forEach)
// Production steps of ECMA-262, Edition 5, 15.4.4.18
// Reference: http://es5.github.com/#x15.4.4.18
// Original comments removed.
if (!Array.prototype.forEach) {
  Array.prototype.forEach = function(callback, thisArg) {
    var T, k;
    if (this == null) {
      throw new TypeError(" this is null or not defined");
    }
    var O = Object(this);
    var len = O.length >>> 0;
    if ({}.toString.call(callback) != "[object Function]") {
      throw new TypeError(callback + " is not a function");
    }
    if (thisArg) {
      T = thisArg;
    }
    k = 0;
    while (k < len) {
      var kValue;
      if (k in O) {
        kValue = O[k];
        callback.call(T, kValue, k, O);
      }
      k++;
    }
  };
}

function getTreeClient(comet) {
  $(document).ready(function() {

    // Gets the path of the currently viewed page
    var current_file = getCurrentFile(document.location);

    comet.addOnChannelStateChange(function(state, info) {
      if (state == "CONNECTED") {
        setTimeout(function() {comet.sendExtendedMessage({ type : "TREE_INIT_REQUEST", current : current_file}); }, 0);
      }
    });

    // Add jsTree specific plugins here
    var jstree_plugins = ["themes", "json_data", "contextmenu"];

    // Handler for receiving initial tree request
    comet.setOnExtendedMessage("TREE_INIT", function(msg) {

      // List of tree nodes
      var nodes = [];

      // Object expected by jsTree
      var init = {};
      (msg.data).forEach(function(item) {
        node = makeJSTreeNode(item);
        nodes.push(node);
      });

      // jsTree
      init["json_data"] = {
          "data" : nodes
      };

      // jsTree
      init["plugins"] = jstree_plugins;
      
      init["contextmenu"] = {
        show_at_node : false,
        items: function(data){
          if (data.hasClass("tree-folder")) {
            return {
              newfile : {
                label : "New File",
                action : function (obj) {
                  var path = obj.attr('id');
                  $.dialog.show('dialog'+path+'?action=newfile', 250, 136);
                },
                _class : "contextmenu_newfile",
                separator_before : false,
                separator_after : false,
                icon : false
              },
              newfolder : {
                label : "New Folder",
                action : function (obj) {
                  var path = obj.attr('id');
                  $.dialog.show('dialog'+path+'?action=newfolder', 250, 136);
                },
                _class : "contextmenu_newfolder",
                separator_before : false,
                separator_after : true,
                icon : false
              },
              rename : {
                label : "Rename",
                action : function (obj) {
                  //TODO: implement
                },
                _class : "contextmenu_rename",
                separator_before : false,
                separator_after : false,
                icon : false
              },
              "delete" : {
                label : "Delete",
                action : function (obj) {
                  var path = obj.attr('id');
                  $.dialog.show('dialog'+path+'?action=delete', 250, 112);
                },
                _class : "contextmenu_delete",
                separator_before : false,
                separator_after : true,
                icon : false
              },
              share : {
                label : "Share",
                action : function (obj) {
                  var path = obj.attr('id');
                  $.dialog.show('dialog'+path+'?action=share', 400, 500);
                },
                _class : "contextmenu_share",
                separator_before : false,
                separator_after : false,
                icon : false
              }
            };
          } else if (data.hasClass("tree-file")) {
            return {
              newfile : {
                label : "New File",
                action : function (obj) {
                  var path = obj.attr('id').replace(/\/[^\/]*$/,'');
                  $.dialog.show('dialog'+path+'?action=newfile', 250, 136);
                },
                _class : "contextmenu_newfile",
                separator_before : false,
                separator_after : false,
                icon : false
              },
              newfolder : {
                label : "New Folder",
                action : function (obj) {
                  var path = obj.attr('id').replace(/\/[^\/]*$/,'');
                  $.dialog.show('dialog'+path+'?action=newfolder', 250, 136);
                },
                _class : "contextmenu_newfolder",
                separator_before : false,
                separator_after : true,
                icon : false
              },
              rename : {
                label : "Rename",
                action : function (obj) {
                  //TODO: implement
                },
                _class : "contextmenu_rename",
                separator_before : false,
                separator_after : false,
                icon : false
              },
              "delete" : {
                label : "Delete",
                action : function (obj) {
                  var path = obj.attr('id');
                  $.dialog.show('dialog'+path+'?action=delete', 250, 112);
                },
                _class : "contextmenu_delete",
                separator_before : false,
                separator_after : true,
                icon : false
              },
              share : {
                label : "Share",
                action : function (obj) {
                  var path = obj.attr('id');
                  $.dialog.show('dialog'+path+'?action=share', 400, 500);
                },
                _class : "contextmenu_share",
                separator_before : false,
                separator_after : false,
                icon : false
              }
            };
          }
        }
      };

      // jsTree function to build tree with supplied nodes
      $("#treecontainer").jstree(init);
    });

    // Handler for adding new files to the tree. Happens either when
    // a folder is opened or when a new resource was added
    comet.setOnExtendedMessage("TREE_ADD", function(msg) {
      (msg.data).forEach(function(item) {
        addNodeToDom(item, msg.many);
      });

      // Highlight if necessary
      highlightNode();
    });

    // Handler for request to remove a node
    comet.setOnExtendedMessage("TREE_REMOVE", function(msg) {
      $.jstree._reference("#treecontainer").delete_node("#"+escapeURL(msg.node));
    });

    // Handler for request to open a folder
    comet.setOnExtendedMessage("TREE_OPEN_FOLDER", function(msg) {
      $.jstree._reference("#treecontainer").open_node("#"+escapeURL(msg.node));
    });

    // Handler for request to close a folder
    comet.setOnExtendedMessage("TREE_CLOSE_FOLDER", function(msg) {
      $.jstree._reference("#treecontainer").close_node("#"+escapeURL(msg.node));
    });

    $("#treecontainer").bind("loaded.jstree", function(e, data) {
      highlightNode();
    });
    
    // When a folder is opened, make a request for the child nodes and tell server so
    // that server can save state
    $("#treecontainer").bind("open_node.jstree", function(e, data) {
      comet.sendExtendedMessage({ type : "TREE_FOLDER_OPENED", path : $("#treecontainer").jstree("get_path", data.rslt.obj), current : current_file });
    });

    // When folder is closed, tell server so that server can save state
    $("#treecontainer").bind("close_node.jstree", function(e, data) {

      // Remove nodes from jsTree
      data.rslt.obj.children("ul").remove();

      // Send message
      comet.sendExtendedMessage({ type : "TREE_FOLDER_CLOSED", path : $("#treecontainer").jstree("get_path", data.rslt.obj) });
    });
    $("#treecontainer").bind("before.jstree", function(e, data) {
      if(data.func=="delete_node"){
        var parent = $.jstree._reference("#treecontainer")._get_parent(data.args[0]);
        if($.jstree._reference("#treecontainer")._get_children(parent).length==1){
          $.jstree._reference("#treecontainer").close_node(parent);
        }
      }
    });
  });

  //
  function addNodeToDom(item, many) {

    // Make node expected by jsTree
    var node = makeJSTreeNode(item);

    // Determine position of node under parent. 'inside' will place node as the last child
    var pos = ( ! many) ? findPosition(item.parent, item) : "inside";

    // If node is a folder, create a node for each of the folder's children as well
    if (item.type == "folder") {
      $.jstree._reference("#treecontainer").create_node("#"+escapeURL(item.parent), pos, node, function(){});

      // Recursive call
      item.children.forEach(function(child) {
        addNodeToDom(child);
      });
    } else {
      $.jstree._reference("#treecontainer").create_node("#"+escapeURL(item.parent), pos, node, function(){});
    }
  }

  // If a single node is added as a child, must determine correct ordering
  function findPosition(parent, node) {

    // Initially first position
    var position = 0;
    var children = $.jstree._reference("#treecontainer")._get_children("#"+escapeURL(parent));

    // Compare each child lexicographically
    for (i=0;i<children.length;i++) {
      if (node.name < $.jstree._reference("#treecontainer").get_text(children[i])) {
        return position;
      } else {
        position++;
      }
    }

    return position;
  }

  // Build node structure expected by jsTree
  function makeJSTreeNode(item) {
    var icons = {
      "file" : "/static/img/eclipse/ui.obj.file.gif",
      "folder" : "/static/img/eclipse/ui.obj.folder.gif",
      "project" : "/static/img/eclipse/ui.ide.obj.project.gif"
    };
    var node;
    if (item.type == "folder") {
      node = {
        "data" : {
          "title" : item.name,
          "attr" : {
            "href" : item.path
          },
          "icon" : icons[item.icon]
        },
        "attr" : {id : item.path, "class" : "tree-folder"},
        "state" : item.state,
        "children" : ((item.state == "open") ? getNodeChildren(item) : [])
      }
    } else {
      node = {
          "data" : {
            "title" : item.name,
            "attr" : {
              "href" : item.path
            },
            "icon" : icons[item.icon]
          },
          "attr" : {id : item.path, "class" : "tree-file"}
      }
    }

    return node;
  }

  function getNodeChildren(node) {
    var children = [];

    node.children.forEach(function(item) {
      children.push(makeJSTreeNode(item));
    });

    return children;
  }

  // Mark a node as highlighted
  function highlightNode() {
    var current_file = escapeURL(getCurrentFile(document.location));
    $("#"+current_file+">a").addClass("current-file");
  }

  // Parse returns array of: ['url', 'scheme', 'slash', 'host', 'port', 'path', 'query', 'hash'];
  function getCurrentFile(url) {
    var parse_url = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;
    return '/'+parse_url.exec(url)[5];
  }

  // Escape the url
  function escapeURL(myid) {
    myid = myid.replace(/(\/)/g,'\\$1');
    myid = myid.replace(/(\.)/g,'\\$1');
    myid = myid.replace(/(\:)/g,'\\$1');
    myid = myid.replace(/(\$)/g,'\\$1');
    return myid;
  }
}

$(document).ready(function(){
  getTreeClient(window.ode_comet);
});

/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012  Thomas Oberndörfer
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

define(function (require, exports, module) {

  var mvelo = require('lib/lib-mvelo').mvelo;
  var model = mvelo.getModel();
  var defaults = require('common/lib/defaults');
  defaults.init();
  var prefs = model.getPreferences();

  // ports to decrypt frames
  var dFramePorts = {};
  // ports to decrypt dialogs
  var dDialogPorts = {};
  // decrypt message buffer
  var dMessageBuffer = {};
  // ports to encrypt frames
  var eFramePorts = {};
  // ports to encrypt dialogs
  var eDialogPorts = {};
  // port to password dialog
  var pwdPort = null;
  // port to editor
  var editorPort = null;
  var editorText = '';
  // recipients of encrypted mail
  var eRecipientBuffer = {};
  var scannedHosts = [];

  var specific = {};

  function extend(obj) {
    specific['initScriptInjection'] = obj['initScriptInjection'];
  }


  function addPort(port) {
    var sender = parseName(port.name);
    switch (sender.name) {
      case 'dFrame':
        dFramePorts[sender.id] = port;
        break;
      case 'dDialog':
        if (dFramePorts[sender.id] && !dDialogPorts[sender.id]) {
          dDialogPorts[sender.id] = port;
        } else {
          // invalid
          port.disconnect();
        }
        break;
      case 'eFrame':
        eFramePorts[sender.id] = port;
        break;
      case 'eDialog':
        if (eFramePorts[sender.id] && !eDialogPorts[sender.id]) {
          eDialogPorts[sender.id] =  port;
        } else {
          // invalid
          port.disconnect();
        }
        break;
      case 'pwdDialog':
        pwdPort = port;
        break;
      case 'editor':
        editorPort = port;
        break;
      default:
        console.log('unknown port');
    }
  }

  function removePort(port) {
    var sender = parseName(port.name);
    switch (sender.name) {
      case 'dFrame':
        delete dFramePorts[sender.id];
        break;
      case 'dDialog':
        delete dDialogPorts[sender.id];
        break;
      case 'eFrame':
        delete eFramePorts[sender.id];
        break;
      case 'eDialog':
        delete eDialogPorts[sender.id];
        break;
      case 'pwdDialog':
        pwdPort = null;
        break;
      case 'editor':
        editorPort = null;
        editorText = '';
        break;
      default:
        console.log('unknown port');
    }
    // always delete message buffer
    delete dMessageBuffer[sender.id];
  }

  function handlePortMessage(msg) {
    var id = parseName(msg.sender).id;
    switch (msg.event) {
      case 'pwd-dialog-cancel':
        // forward event to decrypt frame
        dFramePorts[id].postMessage(msg);
        break;
      case 'encrypt-dialog-cancel':
        // forward event to encrypt frame
        eFramePorts[id].postMessage(msg);
        break;
      case 'decrypt-dialog-init':
        if (pwdPort || mvelo.windows.modalActive) {
          // password dialog or modal dialog already open
          dFramePorts[id].postMessage({event: 'remove-dialog'});  
        } else {
          // open password dialog
          mvelo.windows.openPopup('common/ui/modal/pwdDialog.html?id=' + id, {width: 462, height: 377, modal: true});
        }
        break;
      case 'pwd-dialog-init':
        // get armored message from dFrame
        dFramePorts[id].postMessage({event: 'armored-message'});
        break;
      case 'dframe-display-popup':
        mvelo.windows.openPopup('common/ui/modal/decryptPopup.html?id=' + id, {width: 742, height: 450, modal: false});
        break;
      case 'dframe-armored-message':
        var message;
        try {
          message = model.readMessage(msg.data);
          // add message in buffer
          dMessageBuffer[id] = message;
          // pass over keyid and userid to dialog
          pwdPort.postMessage({event: 'message-userid', userid: message.userid, keyid: message.keyid});
        } catch (e) {
          pwdPort.postMessage({event: 'message-userid', error: e});
        }
        break;
      case 'pwd-dialog-ok':
        model.decryptMessage(dMessageBuffer[id], msg.password, function(err, msg) {
          pwdPort.postMessage({event: 'pwd-verification', error: err});
          if (!err) {
            dDialogPorts[id].postMessage({event: 'decrypted-message', message: msg});
          }
        });
        break;
      case 'encrypt-dialog-init':
        // send content
        mvelo.data.load('common/ui/inline/dialogs/templates/encrypt.html', (function(id, content) {
          //console.log('content rendered', content);
          eDialogPorts[id].postMessage({event: 'encrypt-dialog-content', data: content}); 
          // get potential recipients from eFrame
          eFramePorts[id].postMessage({event: 'recipient-proposal'});
        }).bind(undefined, id));
        break;
      case 'eframe-recipient-proposal':
        var emails = sortAndDeDup(msg.data);
        var keys = model.getKeyUserIDs(emails);
        eDialogPorts[id].postMessage({event: 'public-key-userids', keys: keys});
        break;
      case 'encrypt-dialog-ok':
        // add recipients to buffer
        eRecipientBuffer[id] = msg.recipient;
        // get email text from eFrame
        eFramePorts[id].postMessage({event: 'email-text', type: msg.type});
        break;
      case 'eframe-email-text':
        model.encryptMessage(msg.data, eRecipientBuffer[id], function(err, msg) {
          eFramePorts[id].postMessage({event: 'encrypted-message', message: msg});
        });
        break;
      case 'eframe-textarea-element':
        var defaultEncoding = {};
        if (msg.data) {
          defaultEncoding.type = 'text';
          defaultEncoding.editable = false;
        } else {
          defaultEncoding.type = 'html';
          defaultEncoding.editable = true;
        }
        eDialogPorts[id].postMessage({event: 'encoding-defaults', defaults: defaultEncoding});
        break;
      case 'editor-transfer-armored':
        eFramePorts[msg.recipient].postMessage({event: 'set-armored-text', text: msg.data});
        break;
      case 'eframe-display-editor':
        if (editorPort || mvelo.windows.modalActive) {
          // editor or modal dialog already open
        } else {
          mvelo.windows.openPopup('common/ui/modal/editor.html?parent=' + id, {width: 742, height: 400, modal: true});
          editorText = msg.text;
        }
        break;
      case 'editor-init':
        editorPort.postMessage({event: 'set-text', text: editorText});
        break;
      default:
        console.log('unknown event', msg);
    }
  }

  function handleMessageEvent(request, sender, sendResponse) {
    switch (request.event) {
      case 'viewmodel':
        var response = {};
        var callback = function(error, result) {
          sendResponse({error: error, result: result});
        };
        request.args = request.args || [];
        if (!Array.isArray(request.args)) {
          request.args = [request.args];
        }
        request.args.push(callback);
        try {
          response.result = model[request.method].apply(model, request.args);
        } catch (e) {
          response.error = e;
        }
        if (response.result || response.error) {
          sendResponse(response);
        }
        break;
      case 'browser-action':
        onBrowserAction(request.action);
        break;
      case 'iframe-scan-result':
        scannedHosts = scannedHosts.concat(request.result);
        break;
      case 'set-watch-list':
        model.setWatchList(request.message.data);
        specific.initScriptInjection();
        break;
      case 'send-by-mail':
        var link = 'mailto:';
        link += '?subject=Public OpenPGP key of ' + request.message.data.name;
        link += '&body=' + request.message.data.armoredPublic;
        link += '\n' + '*** exported with www.mailvelope.com ***';
        mvelo.tabs.create(encodeURI(link));
        break;
      case 'get-prefs':
        sendResponse(prefs);
        break;
      case 'set-prefs':
        prefs = request.message.data;
        model.setPreferences(prefs);
        sendResponse(true);
        break;
      case 'get-security-token':
        sendResponse({code: prefs.security.secure_code, color: prefs.security.secure_color});
        break;
      default:
        console.log('unknown event:', msg.event);
    }
  }

  function removePortByRef(port) {
    function deletePort(portHash, port) {
      for (var p in portHash) {
        if (portHash.hasOwnProperty(p)) {
          if (p.ref === port || p === port) {
            delete portHash[p];
          }
        }
      }
    }
    deletePort(dFramePorts, port);
    deletePort(eFramePorts, port);
    deletePort(dDialogPorts, port);
    deletePort(eDialogPorts, port);
  }

  function reloadFrames() {
    // close frames
    for (id in dFramePorts) {
      if (dFramePorts.hasOwnProperty(id)) {
        //console.log('post message destroy to dFrame%s', id);
        dFramePorts[id].postMessage({event: 'destroy'});
      }
    }
    for (id in eFramePorts) {
      if (eFramePorts.hasOwnProperty(id)) {
        //console.log('post message destroy to eFrame%s', id);
        eFramePorts[id].postMessage({event: 'destroy'});
      }
    }
  }

  function addToWatchList() {
    var scanScript = " \
        var hosts = $('iframe').get().map(function(element) { \
          return $('<a/>').attr('href', element.src).prop('hostname'); \
        }); \
        hosts.push(document.location.hostname); \
        mvelo.extension.sendMessage({ \
          event: 'iframe-scan-result', \
          result: hosts \
        }); \
      ";

    mvelo.tabs.getActive(function(tab) {
      if (tab) {
        // reset scanned hosts buffer
        scannedHosts.length = 0;
        var options = {};
        options.contentScriptFile = [];
        options.contentScriptFile.push("common/dep/jquery.min.js");
        options.contentScriptFile.push("common/ui/inline/mvelo.js");
        if (!mvelo.crx) {
          options.contentScriptFile.push("ui/messageAdapter.js");
        }
        options.contentScript = scanScript;
        options.onMessage = handleMessageEvent;
        // inject scan script
        mvelo.tabs.attach(tab, options, function() {
          if (scannedHosts.length === 0) return;
          // remove duplicates and add wildcards
          var hosts = reduceHosts(scannedHosts);
          var site = model.getHostname(tab.url);
          scannedHosts.length = 0;
          mvelo.tabs.loadOptionsTab('', handleMessageEvent, function(old, tab) {
            sendToWatchList(tab, site, hosts, old);
          });
        });
      }
    });

  }

  function sendToWatchList(tab, site, hosts, old) {
    mvelo.tabs.sendMessage(tab, {
      event: "add-watchlist-item",
      site: site,
      hosts: hosts,
      old: old
    });
  }

  function removeFromWatchList() {
    // get selected tab
    mvelo.tabs.getActive(function(tab) {
      if (tab) {
        var site = model.getHostname(tab.url);
        mvelo.tabs.loadOptionsTab('', handleMessageEvent, function(old, tab) {
          mvelo.tabs.sendMessage(tab, {
            event: "remove-watchlist-item",
            site: site,
            old: old
          });
        });
      }
    });
  }

  function onBrowserAction(action) {
    switch (action) {
      case 'reload':
        reloadFrames();
        break;
      case 'add':
        addToWatchList();
        break;
      case 'remove':
        removeFromWatchList();
        break;
      case 'options':
        loadOptions('#home');
        break;
      case 'help':
        loadOptions('#help');
        break;
      default:
        console.log('unknown browser action');
    }
  }

  function loadOptions(hash) {
    mvelo.tabs.loadOptionsTab(hash, handleMessageEvent, function(old, tab) {
      if (old) {
        mvelo.tabs.sendMessage(tab, {
          event: "reload-options",
          hash: hash
        })
      }
    });
  }

  function reduceHosts(hosts) {
    var reduced = [];
    hosts.forEach(function(element) {
      var labels = element.split('.');
      if (labels.length < 2) return;
      if (labels.length <= 3) {
        if (/www.*/.test(labels[0])) {
          labels[0] = '*';  
        } else {
          labels.unshift('*');
        }
        reduced.push(labels.join('.'));
      } else {
        reduced.push('*.' + labels.slice(-3).join('.'));
      }
    });
    return sortAndDeDup(reduced);
  }

  function sortAndDeDup(unordered, compFn) {
    var result = [];
    var prev = -1;
    unordered.sort(compFn).forEach(function(item) {
      var equal = (compFn !== undefined && prev !== undefined) 
      ? compFn(prev, item) === 0 : prev === item; 
      if (!equal) {
        result.push(item);
        prev = item;
      }
    });
    return result;
  }

  function getWatchListFilterURLs() {
    var result = [];
    model.getWatchList().forEach(function(site) {
      site.active && site.frames && site.frames.forEach(function(frame) {
        frame.scan && result.push(frame.frame);
      });
    });
    if (result.length !== 0) {
      result = sortAndDeDup(result);
    }
    return result;
  }

  exports.addPort = addPort;
  exports.removePort = removePort;
  exports.handlePortMessage = handlePortMessage;
  exports.handleMessageEvent = handleMessageEvent;
  exports.removePortByRef = removePortByRef;
  exports.onBrowserAction = onBrowserAction;
  exports.extend = extend;
  exports.getWatchListFilterURLs = getWatchListFilterURLs;

  function parseName(nameStr) {
    var pair = nameStr.split('-');
    return { name: pair[0], id: pair[1] };
  }

});
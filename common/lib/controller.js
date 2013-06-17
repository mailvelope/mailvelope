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
  var model = require('./pgpViewModel');
  require('./defaults');
  var prefs = require('./prefs');
  var pwdCache = require('./pwdCache');

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
  // editor window
  var editor = null;
  // decrypt popup window
  var decryptPopup = null;
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
        editor.port = port;
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
        editor = null;
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
      case 'decrypt-dialog-cancel':
        // forward event to decrypt frame
        dFramePorts[id].postMessage({event: 'dialog-cancel'});
        if (decryptPopup) {
          decryptPopup.close();
          decryptPopup = null;
        }
        break;
      case 'encrypt-dialog-cancel':
        // forward event to encrypt frame
        eFramePorts[id].postMessage(msg);
        break;
      case 'decrypt-inline-init':
        if (pwdPort || mvelo.windows.modalActive) {
          // password dialog or modal dialog already open
          dFramePorts[id].postMessage({event: 'remove-dialog'});
        } else {
          // get armored message from dFrame
          dFramePorts[id].postMessage({event: 'armored-message'});  
        }
        break;
      case 'decrypt-popup-init':
        // get armored message from dFrame
        dFramePorts[id].postMessage({event: 'armored-message'});
        break;
      case 'pwd-dialog-init':
        // pass over keyid and userid to dialog
        pwdPort.postMessage({event: 'message-userid', userid: dMessageBuffer[id].userid, keyid: dMessageBuffer[id].primkeyid, cache: prefs.data.security.password_cache});
        break;
      case 'dframe-display-popup':
        // decrypt popup potentially needs pwd dialog
        if (pwdPort || mvelo.windows.modalActive) {
          // password dialog or modal dialog already open
          dFramePorts[id].postMessage({event: 'remove-dialog'});        
        } else {
          mvelo.windows.openPopup('common/ui/modal/decryptPopup.html?id=' + id, {width: 742, height: 450, modal: true}, function(window) {
            decryptPopup = window;
          });
        }
        break;
      case 'dframe-armored-message':
        try {
          var message = model.readMessage(msg.data);
          // password or unlocked key in cache?
          var cache = pwdCache.get(message.primkeyid, message.keyid);
          if (!cache) {
            // add message in buffer
            dMessageBuffer[id] = message;
            // open password dialog
            if (prefs.data.security.display_decrypted == mvelo.DISPLAY_INLINE) {
              mvelo.windows.openPopup('common/ui/modal/pwdDialog.html?id=' + id, {width: 462, height: 377, modal: true});
            } else if (prefs.data.security.display_decrypted == mvelo.DISPLAY_POPUP) {
              dDialogPorts[id].postMessage({event: 'show-pwd-dialog'});
            }
          } else {
            if (!cache.key) {
              // unlock key
              var unlocked = model.unlockKey(message.privkey, cache.password);
              if (!unlocked) {
                throw {
                  type: 'error',
                  message: 'Password caching does not support different passphrases for primary key and subkeys'
                }
              }
              // set unlocked key in cache
              pwdCache.set(message);
            } else {
              // take unlocked key from cache
              message.privkey = cache.key;
            }
            decryptMessage(message, id);
          }
        } catch (e) {
          // display error message in decrypt dialog
          dDialogPorts[id].postMessage({event: 'error-message', error: e.message});
        }
        break;
      case 'pwd-dialog-ok':
        var message = dMessageBuffer[id];
        try {
          if (model.unlockKey(message.privkey, msg.password)) {
            // password correct
            if (msg.cache != prefs.data.security.password_cache) {
              // update pwd cache status
              prefs.update({security: {password_cache: msg.cache}});
            }
            if (msg.cache) {
              // set unlocked key and password in cache
              pwdCache.set(message, msg.password);
            }
            pwdPort.postMessage({event: 'correct-password'});
            decryptMessage(message, id);
          } else {
            // password wrong
            pwdPort.postMessage({event: 'wrong-password'});
          }
        } catch (e) {
          // display error message in decrypt dialog
          dDialogPorts[id].postMessage({event: 'error-message', error: e.message});
        }
        break;
      case 'encrypt-dialog-init':
        // send content
        mvelo.data.load('common/ui/inline/dialogs/templates/encrypt.html', function(content) {
          //console.log('content rendered', content);
          eDialogPorts[id].postMessage({event: 'encrypt-dialog-content', data: content}); 
          // get potential recipients from eFrame
          // if editor is active get recipients from parent eFrame
          eFramePorts[editor && editor.parent || id].postMessage({event: 'recipient-proposal'});
        });
        break;
      case 'eframe-recipient-proposal':
        var emails = sortAndDeDup(msg.data);
        var keys = model.getKeyUserIDs(emails);
        var primary = prefs.data.general.auto_add_primary && prefs.data.general.primary_key;
        // if editor is active send to corresponding eDialog
        eDialogPorts[editor && editor.id || id].postMessage({event: 'public-key-userids', keys: keys, primary: primary});
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
        if (msg.data && prefs.data.security.editor_mode == mvelo.EDITOR_WEBMAIL
          || prefs.data.security.editor_mode == mvelo.EDITOR_EXTERNAL
             && prefs.data.general.editor_type == mvelo.PLAIN_TEXT) {
          defaultEncoding.type = 'text';
          defaultEncoding.editable = false;
        } else {
          defaultEncoding.type = 'html';
          defaultEncoding.editable = true;
        }
        // if editor is active send to corresponding eDialog
        eDialogPorts[editor && editor.id || id].postMessage({event: 'encoding-defaults', defaults: defaultEncoding});
        break;
      case 'editor-transfer-output':
        // sanitize if content from plain text, rich text already sanitized by editor
        if (prefs.data.general.editor_type == mvelo.PLAIN_TEXT) {
          msg.data = mvelo.util.parseHTML(msg.data);
        } 
        // editor transfers message to recipient encrypt frame
        eFramePorts[msg.recipient].postMessage({event: 'set-editor-output', text: msg.data});
        editor.window.close();
        editor = null;
        break;
      case 'eframe-display-editor':
        if (editor || mvelo.windows.modalActive) {
          // editor or modal dialog already open
          editor.window.activate(); // focus
        } else {
          // creater editor object
          editor = {};
          // store text for transfer
          editor.text = msg.text;
          // store id of parent eframe
          editor.parent = id;
          mvelo.windows.openPopup('common/ui/modal/editor.html?parent=' + id + '&editor_type=' + prefs.data.general.editor_type, {width: 742, height: 450, modal: false}, function(window) {
            editor.window = window;
          }); 
        }
        break;
      case 'editor-init':
        // store id of editor == eframe id == edialog id
        editor.id = id;
        editor.port.postMessage({event: 'set-text', text: editor.text});
        break;
      case 'editor-cancel':
        editor.window.close();
        editor = null;
        break;
      default:
        console.log('unknown event', msg);
    }
  }

  function handleMessageEvent(request, sender, sendResponse) {
    //console.log('controller: handleMessageEvent', request.event);
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
          console.log('error in viewmodel: ', e);
          response.error = e;
        }
        if (response.result !== undefined || response.error || request.callback) {
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
        var link = encodeURI('mailto:?subject=Public OpenPGP key of ');
        link += encodeURIComponent(request.message.data.name);
        link += '&body=' + encodeURIComponent(request.message.data.armoredPublic);
        link += encodeURIComponent('\n*** exported with www.mailvelope.com ***');
        mvelo.tabs.create(link);
        break;
      case 'get-prefs':
        sendResponse(prefs.data);
        break;
      case 'set-prefs':
        prefs.update(request.message.data);
        sendResponse(true);
        break;
      case 'get-security-token':
        sendResponse({code: prefs.data.security.secure_code, color: prefs.data.security.secure_color});
        break;
      default:
        console.log('unknown event:', msg.event);
    }
  }

  function decryptMessage(message, id) {
    model.decryptMessage(message, function(err, msgText) {
      if (err) {
        // display error message in decrypt dialog
        dDialogPorts[id].postMessage({event: 'error-message', error: err.message});
      } else {
        // decrypted correctly
        msgText = mvelo.util.parseHTML(msgText); // sanitize message
        dDialogPorts[id].postMessage({event: 'decrypted-message', message: msgText});
      }
    });
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
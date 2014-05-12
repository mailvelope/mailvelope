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

(function() {
  if (document.mveloControl) return;

  var interval = 2500; // ms
  var regex = /END\sPGP/;
  var status = mvelo.SCAN_ON;
  var minEditHeight = 84;
  var contextTarget = null;
  var prefs;

  function init() {
    getPrefs();
    initScanInterval(interval);
    addMessageListener();
    //initContextMenu();
  }

  function initScanInterval(interval) {
    window.setInterval(function() {
      //console.log('inside cs: ', document.location.host);
      if (status === mvelo.SCAN_ON) {
        // find armored PGP text
        var pgpTag = findPGPTag(regex);
        if (pgpTag.length !== 0) {
          attachExtractFrame(pgpTag);
        }
        // find editable content
        var editable = findEditable();
        if (editable.length !== 0) {
          attachEncryptFrame(editable);
        }
      }
    }, interval);
  }

  function getPrefs() {
    mvelo.extension.sendMessage({event: "get-prefs"}, function(resp) {
      prefs = resp;
    });
  }

  /**
   * find text nodes in DOM that match certain pattern
   * @param regex
   * @return $([nodes])
   */
  function findPGPTag(regex) {
    var treeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node) {
        if (node.parentNode.tagName !== 'SCRIPT' && regex.test(node.textContent)) {
          return NodeFilter.FILTER_ACCEPT;
        } else {
          return NodeFilter.FILTER_REJECT;
        }
      }
    }, false);

    var nodeList = [];

    while (treeWalker.nextNode()) nodeList.push(treeWalker.currentNode);

    // filter out hidden elements
    nodeList = $(nodeList).filter(function() {
      var element = $(this);
      // visibility check does not work on text nodes
      return element.parent().is(':visible') &&
        // no elements within editable elements
        element.parents('[contenteditable], textarea').length === 0 &&
        this.ownerDocument.designMode !== 'on';
    });

    return nodeList;
  }

  function findEditable() {
    // find textareas and elements with contenteditable attribute, filter out <body>
    var editable = $('[contenteditable], textarea').filter(':visible').not('body');
    var iframes = $('iframe').filter(':visible');
    // find dynamically created iframes where src is not set
    var dynFrames = iframes.filter(function() {
      var src = $(this).attr('src');
      return src === undefined ||
             src === '' ||
             /^javascript.*/.test(src) ||
             /^about.*/.test(src);
    });
    // find editable elements inside dynamic iframe (content script is not injected here)
    dynFrames.each(function() {
      var content = $(this).contents();
      // set event handler for contextmenu
      content.find('body').off("contextmenu").on("contextmenu", onContextMenu)
      // mark body as 'inside iframe'
                          .data(mvelo.DYN_IFRAME, true)
      // add iframe element
                          .data(mvelo.IFRAME_OBJ, $(this));
      // document of iframe in design mode or contenteditable set on the body
      if (content.attr('designMode') === 'on' || content.find('body[contenteditable]').length !== 0) {
        // add iframe to editable elements
        editable = editable.add($(this));
      } else {
        // editable elements inside iframe
        var editblElem = content.find('[contenteditable], textarea').filter(':visible');
        editable = editable.add(editblElem);
      }
    });
    // find iframes from same origin with a contenteditable body (content script is injected, but encrypt frame needs to be attached to outer iframe)
    var anchor = $('<a/>');
    var editableBody = iframes.not(dynFrames).filter(function() {
      var frame = $(this);
      // only for iframes from same host
      if (anchor.attr('href', frame.attr('src')).prop('hostname') === document.location.hostname) {
        try {
          var content = frame.contents();
          if (content.attr('designMode') === 'on' || content.find('body[contenteditable]').length !== 0) {
            // set event handler for contextmenu
            content.find('body').off("contextmenu").on("contextmenu", onContextMenu);
            // mark body as 'inside iframe'
            content.find('body').data(mvelo.IFRAME_OBJ, frame);
            return true;
          } else {
            return false;
          }
        } catch (e) {
          return false;
        }
      }
    });
    editable = editable.add(editableBody);
    // filter out elements below a certain height limit
    editable = editable.filter(function() {
      return $(this).height() > minEditHeight;
    });
    return editable;
  }

  function getMessageType(pgpEnd) {
    var armored = pgpEnd.text();
    if (/END\sPGP\sMESSAGE/.test(armored)) {
      return mvelo.PGP_MESSAGE;
    } else if (/END\sPGP\sSIGNATURE/.test(armored)) {
      return mvelo.PGP_SIGNATURE;
    } else if (/END\sPGP\sPUBLIC\sKEY\sBLOCK/.test(armored)) {
      return mvelo.PGP_PUBLIC_KEY;
    } else if (/END\sPGP\sPRIVATE\sKEY\sBLOCK/.test(armored)) {
      return mvelo.PGP_PRIVATE_KEY;
    }
  }

  function attachExtractFrame(element) {
    // check status of PGP tags
    var newObj = element.filter(function() {
      return !ExtractFrame.isAttached($(this).parent());
    });
    // create new decrypt frames for new discovered PGP tags
    newObj.each(function(index, element) {
      // parent element of text node
      var pgpEnd = $(element).parent();
      switch (getMessageType(pgpEnd)) {
        case mvelo.PGP_MESSAGE:
          var dFrame = new DecryptFrame(prefs);
          dFrame.attachTo(pgpEnd);
          break;
        case mvelo.PGP_SIGNATURE:
          var vFrame = new VerifyFrame(prefs);
          vFrame.attachTo(pgpEnd);
          break;
        case mvelo.PGP_PUBLIC_KEY:
          var imFrame = new ImportFrame(prefs);
          imFrame.attachTo(pgpEnd);
          break;
      }
    });
  }

  /**
   * attach encrypt frame to element
   * @param  {$} element
   * @param  {boolean} expanded state of frame
   */
  function attachEncryptFrame(element, expanded) {
    // check status of elements
    var newObj = element.filter(function() {
      if (expanded) {
        // filter out only attached frames
        if (element.data(mvelo.FRAME_STATUS) === mvelo.FRAME_ATTACHED) {
          // trigger expand state of attached frames
          element.data(mvelo.FRAME_OBJ).showEncryptDialog();
          return false;
        } else {
          return true;
        }
      } else {
        // filter out attached and detached frames
        return !EncryptFrame.isAttached($(this));
      }
    });
    // create new encrypt frames for new discovered editable fields
    newObj.each(function(index, element) {
      var eFrame = new EncryptFrame(prefs);
      eFrame.attachTo($(element), {expanded: expanded});
    });
  }

  function addMessageListener() {
    mvelo.extension.onMessage.addListener(
      function(request) {
        //console.log('contentscript: %s onRequest: %o', document.location.toString(), request);
        if (request.event === undefined) return;
        switch (request.event) {
          case 'on':
            status = mvelo.SCAN_ON;
            break;
          case 'off':
            status = mvelo.SCAN_OFF;
            break;
          case 'context-encrypt':
            if (contextTarget !== null) {
              attachEncryptFrame(contextTarget, true);
              contextTarget = null;
            }
            break;
          default:
            console.log('unknown scan status');
        }
      }
    );
  }

  function initContextMenu() {
    // set handler
    $("body").on("contextmenu", onContextMenu);
  }

  function onContextMenu(e) {
    //console.log(e.target);
    var target = $(e.target);
    // find editable descendants or ascendants
    var element = target.find('[contenteditable], textarea');
    if (element.length === 0) {
      element = target.closest('[contenteditable], textarea');
    }
    if (element.length !== 0 && !element.is('body')) {
      if (element.height() > minEditHeight) {
        contextTarget = element;
      } else {
        contextTarget = null;
      }
      return;
    }
    // inside dynamic iframe or iframes from same origin with a contenteditable body
    element = target.closest('body');
    // get outer iframe
    var iframeObj = element.data(mvelo.IFRAME_OBJ);
    if (iframeObj !== undefined) {
      // target set to outer iframe
      contextTarget = iframeObj;
      return;
    }
    // no suitable element found
    contextTarget = null;
  }

  document.mveloControl = true;
  init();

}());

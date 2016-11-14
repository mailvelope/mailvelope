/**
 * Copyright (C) 2013-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

import mvelo from '../mvelo';
import $ from 'jquery';

export default class ExtractFrame {
  constructor(prefs) {
    if (!prefs) {
      throw {
        message: 'ExtractFrame constructor: prefs not provided.'
      };
    }
    this.id = mvelo.util.getHash();
    // element with Armor Tail Line '-----END PGP...'
    this._pgpEnd = null;
    // element that contains complete ASCII Armored Message
    this._pgpElement = null;
    this._pgpElementAttr = {};
    this._eFrame = null;
    this._port = null;
    this._refreshPosIntervalID = null;
    this._pgpStartRegex = /BEGIN\sPGP/;
  }

  attachTo(pgpEnd) {
    this._init(pgpEnd);
    this._establishConnection();
    this._renderFrame();
    this._registerEventListener();
  }

  _init(pgpEnd) {
    this._pgpEnd = pgpEnd;
    // find element with complete armored text and width > 0
    this._pgpElement = pgpEnd;
    var maxNesting = 8;
    var beginFound = false;
    for (var i = 0; i < maxNesting; i++) {
      if (this._pgpStartRegex.test(this._pgpElement.text()) &&
          this._pgpElement.width() > 0) {
        beginFound = true;
        break;
      }
      this._pgpElement = this._pgpElement.parent();
      if (this._pgpElement.get(0).nodeName === 'HTML') {
        break;
      }
    }
    // set status to attached
    this._pgpEnd.data(mvelo.FRAME_STATUS, mvelo.FRAME_ATTACHED);
    // store frame obj in pgpText tag
    this._pgpEnd.data(mvelo.FRAME_OBJ, this);

    if (!beginFound) {
      throw new Error('Missing BEGIN PGP header.');
    }

    this._pgpElementAttr.marginTop = parseInt(this._pgpElement.css('margin-top'), 10);
    this._pgpElementAttr.paddingTop = parseInt(this._pgpElement.css('padding-top'), 10);
  }

  _renderFrame() {
    this._eFrame = $('<div/>', {
      id: 'eFrame-' + this.id,
      'class': 'm-extract-frame m-cursor',
      html: '<a class="m-frame-close">×</a>'
    });

    this._setFrameDim();

    this._eFrame.insertAfter(this._pgpElement);
    if (this._pgpElement.height() > mvelo.LARGE_FRAME) {
      this._eFrame.addClass('m-large');
    }
    this._eFrame.fadeIn('slow');

    this._eFrame.on('click', this._clickHandler.bind(this));
    this._eFrame.find('.m-frame-close').on('click', this._closeFrame.bind(this));

    $(window).resize(this._setFrameDim.bind(this));
    this._refreshPosIntervalID = window.setInterval(() => this._setFrameDim(), 1000);
  }

  _clickHandler(callback) {
    this._eFrame.off('click');
    this._toggleIcon(callback);
    this._eFrame.removeClass('m-cursor');
    return false;
  }

  _closeFrame(finalClose) {
    this._eFrame.fadeOut(function() {
      window.clearInterval(this._refreshPosIntervalID);
      $(window).off('resize');
      this._eFrame.remove();
      if (finalClose === true) {
        this._port.disconnect();
        this._pgpEnd.data(mvelo.FRAME_STATUS, null);
      } else {
        this._pgpEnd.data(mvelo.FRAME_STATUS, mvelo.FRAME_DETACHED);
      }
      this._pgpEnd.data(mvelo.FRAME_OBJ, null);
    }.bind(this));
    return false;
  }

  _toggleIcon(callback) {
    this._eFrame.one('transitionend', callback);
    this._eFrame.toggleClass('m-open');
  }

  _setFrameDim() {
    var pgpElementPos = this._pgpElement.position();
    this._eFrame.width(this._pgpElement.width() - 2);
    this._eFrame.height(this._pgpEnd.position().top + this._pgpEnd.height() - pgpElementPos.top - 2);
    this._eFrame.css('top', pgpElementPos.top + this._pgpElementAttr.marginTop + this._pgpElementAttr.paddingTop);
  }

  _establishConnection() {
    this._port = mvelo.extension.connect({name: this._ctrlName});
    //console.log('Port connected: %o', this._port);
  }

  _getArmoredMessage() {
    var msg;
    // selection method does not work in Firefox if pre element without linebreaks with <br>
    if (this._pgpElement.is('pre') && !this._pgpElement.find('br').length) {
      msg = this._pgpElement.text();
    } else {
      var element = this._pgpElement.get(0);
      var sel = element.ownerDocument.defaultView.getSelection();
      sel.selectAllChildren(element);
      msg = sel.toString();
      sel.removeAllRanges();
    }
    return msg;
  }

  _getPGPMessage() {
    var msg = this._getArmoredMessage();
    // additional filtering to get well defined PGP message format
    msg = msg.replace(/\n\s+/g, '\n'); // compress sequence of whitespace and new line characters to one new line
    msg = msg.match(this._typeRegex)[0];
    msg = msg.replace(/^(\s?>)+/gm, ''); // remove quotation
    msg = msg.replace(/^\s+/gm, ''); // remove leading whitespace
    msg = msg.replace(/:.*\n(?!.*:)/, '$&\n');  // insert new line after last armor header
    msg = msg.replace(/-----\n(?!.*:)/, '$&\n'); // insert new line if no header
    msg = mvelo.util.decodeQuotedPrint(msg);
    return msg;
  }

  _registerEventListener() {
    var that = this;
    this._port.onMessage.addListener(function(msg) {
      switch (msg.event) {
        case 'destroy':
          that._closeFrame(true);
          break;
      }
    });
    this._port.onDisconnect.addListener(function() {
      that._closeFrame(false);
    });
  }
}

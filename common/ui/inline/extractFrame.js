/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2013  Thomas Oberndörfer
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

var ExtractFrame = ExtractFrame || (function() {

  var extractFrame = function(prefs) {
    if (!prefs) {
      throw {
        message: 'ExtractFrame constructor: prefs not provided.'
      };
    }
    this.id = mvelo.getHash();
    // element with Armor Tail Line '-----END PGP...'
    this._pgpEnd = null;
    // element that contains complete ASCII Armored Message
    this._pgpElement = null;
    this._pgpElementAttr = {};
    this._eFrame = null;
    this._port = null;
    this._refreshPosIntervalID = null;
  };

  extractFrame.prototype = {

    attachTo: function(pgpEnd) {
      this._init(pgpEnd);
      this._renderFrame();
      this._establishConnection();
      this._registerEventListener();
    },

    _init: function(pgpEnd) {
      this._pgpEnd = pgpEnd;
      // find element with complete armored text and width > 0
      var regex = /BEGIN\sPGP/;
      this._pgpElement = pgpEnd;
      while (!regex.test(this._pgpElement.text()) || this._pgpElement.width() <= 0) {
        this._pgpElement = this._pgpElement.parent();
      }
      // set status to attached
      this._pgpEnd.data(mvelo.FRAME_STATUS, mvelo.FRAME_ATTACHED);
      // store frame obj in pgpText tag
      this._pgpEnd.data(mvelo.FRAME_OBJ, this);

      this._pgpElementAttr.marginTop = parseInt(this._pgpElement.css('margin-top'), 10);
      this._pgpElementAttr.paddingTop = parseInt(this._pgpElement.css('padding-top'), 10);
    },

    _renderFrame: function() {
      this._eFrame = $('<div/>', {
        id: 'eFrame-' + this.id,
        'class': 'm-extract-frame m-cursor',
        html: '<a class="m-frame-close">×</a>'
      });

      this._pgpElement.wrap($('<div>').addClass('m-frame-wrapper'));
      this._eFrame.insertAfter(this._pgpElement);
      if (this._pgpElement.height() > mvelo.LARGE_FRAME) {
        this._eFrame.addClass('m-large');
      }
      this._eFrame.fadeIn('slow');

      this._eFrame.on('click', this._clickHandler.bind(this));
      this._eFrame.find('.m-frame-close').on('click', this._closeFrame.bind(this));
    },

    _clickHandler: function(callback) {
      this._eFrame.off('click');
      this._toggleIcon(callback);
      this._eFrame.removeClass('m-cursor');
      return false;
    },

    _closeFrame: function(finalClose) {
      this._pgpElement.unwrap();
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
    },

    _toggleIcon: function(callback) {
      this._eFrame.one('transitionend', callback);
      this._eFrame.toggleClass('m-open');
    },

    _setFrameDim: function() {
      var pgpElementPos = this._pgpElement.position();
      this._eFrame.width(this._pgpElement.width() - 2);
      this._eFrame.height(this._pgpEnd.position().top + this._pgpEnd.height() - pgpElementPos.top - 2);
      this._eFrame.css('top', pgpElementPos.top + this._pgpElementAttr.marginTop + this._pgpElementAttr.paddingTop);
    },

    _establishConnection: function() {
      this._port = mvelo.extension.connect({name: this._ctrlName});
      //console.log('Port connected: %o', this._port);
    },

    _htmlDecode: function(html) {
      return String(html)
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&#039;/g, "\'")
        .replace(/&#x2F;/g, "\/");
    },

    _getArmoredMessage: function() {
      if (this._pgpElement.is('pre')) {
        var msg = this._pgpElement.clone();
        msg.find('br').replaceWith('\n');
        return msg.text();
      } else {
        var msg = this._pgpElement.html();
        msg = msg.replace(/\n/g, ' '); // replace new line with space
        msg = msg.replace(/(<br>)/g, '\n'); // replace <br> with new line
        //msg = msg.replace(/<(\/.+?)>/g, '\n'); // replace closing tags </..> with new line
        msg = msg.replace(/<\/(blockquote|div|dl|dt|dd|form|h1|h2|h3|h4|h5|h6|hr|ol|p|pre|table|tr|td|ul|li|section|header|footer)>/g, '\n'); // replace block closing tags </..> with new line
        msg = msg.replace(/<(.+?)>/g, ''); // remove tags
        //
        msg = msg.replace(/&nbsp;/g, ' '); // replace non-breaking space with whitespace
        msg = msg.replace(/\n\s+/g, '\n'); // compress sequence of whitespace and new line characters to one new line
        msg = msg.match(this._typeRegex)[0];
        msg = msg.replace(/:.*\n(?!.*:)/, '$&\n');  // insert new line after last armor header
        msg = this._htmlDecode(msg);
        return msg;
      }
    },

    _registerEventListener: function() {
      var that = this;
      this._port.onMessage.addListener(function(msg) {
        switch (msg.event) {
          case 'destroy':
            that._closeFrame(true);
            break;
        }
      });
    }

  };

  extractFrame.isAttached = function(pgpEnd) {
    var status = pgpEnd.data(mvelo.FRAME_STATUS);
    switch (status) {
      case mvelo.FRAME_ATTACHED:
      case mvelo.FRAME_DETACHED:
        return true;
      default:
        return false;
    }
  };

  return extractFrame;

}());

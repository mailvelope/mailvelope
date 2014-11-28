/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014  Thomas Oberndörfer
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

'use strict';

var mvelo = mvelo || {};

mvelo.EditorContainer = function(selector) {
  this.selector = selector;
  this.id = mvelo.util.getHash();
  this.name = 'editorCont-' + this.id;
  this.port = mvelo.extension.connect({name: this.name});
  this.registerEventListener();
  this.parent = null;
  this.container = null;
  this.done = null;
};

mvelo.EditorContainer.prototype.create = function(done) {
  this.done = done;
  this.parent = document.querySelector(this.selector);
  this.container = document.createElement('iframe');
  /*
  var url;
  if (mvelo.crx) {
    url = mvelo.extension.getURL('common/ui/inline/dialogs/decryptInline.html?id=' + this.id);
  } else if (mvelo.ffa) {
    url = 'about:blank?mvelo=decryptInline&id=' + this.id;
  }
  this.container.setAttribute('src', url);
  */
  this.container.setAttribute('srcdoc', '<h3>Editor</h3><textarea rows="12" style="width: 500px;"></textarea>');
  this.container.setAttribute('frameBorder', 0);
  this.container.setAttribute('scrolling', 'no');
  this.container.style.width = '100%';
  this.container.style.height = '100%';
  this.parent.appendChild(this.container);
  this.done(this.id);
};

mvelo.EditorContainer.prototype.encrypt = function(callback) {
  callback('\n\
    -----BEGIN PGP MESSAGE-----\n\
    Version: GnuPG v1.4.11 (GNU/Linux)\n\
    \n\
    OcgV2ELuIsCTNGGdQPv0FQDl0SS6TTgCjVytfHvgP8STWms2w/ynuMuEz/rZJMQJ\n\
    jKaE+dry2CqkSg9xWCm3Ji9xaxGAkYVeLcX2FEeieQo8YQ6Vk9EFVRpjJgjkrkQJ\n\
    /8fBQHHCks/L12KZniS55ivhnkRD6YxaRfV7eRqH7LrsvtZ2JYS9uq86VdW9s1Tm\n\
    i+nAQ4jO4FA8/FAmoN45IxzIAdC84k8+CapcjJ08wNWZ5vYyxCN4oKhOCVs2INwZ\n\
    vGFOclsjqcZFuqU8KtCX/3etWR5rpdi1RU7GJF+1u8nf4noSOXWBu3ZqXZj0grVs\n\
    jsNlzQLKmrGsw6bQkaC2NdLyVBjJqGyeWUBQ2OYpBD3+hvpMM95fYRYOhBXxKJps\n\
    58gCgxa/yymi6wWGCvgIPY0KajoSRlir3H/avqLGkUUdi6XEla51Y0kUi3PJPHa2\n\
    qD3/8chOMo1J16GQG52jDrDThnk8F38hazepZJ462Q==\n\
    =AQVY\n\
    -----END PGP MESSAGE-----\n');
};

mvelo.EditorContainer.prototype.registerEventListener = function() {
  var that = this;
  this.port.onMessage.addListener(function(msg) {
    switch (msg.event) {
      case 'destroy':
        that.parent.removeChild(this.container);
        that.port.disconnect();
        break;
      case 'error-message':
        that.done(msg.error);
        break;
      default:
        console.log('unknown event', msg);
    }
  });
};
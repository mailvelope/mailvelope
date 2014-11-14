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

define(function (require, exports, module) {

  var sub = require('./sub.controller');

  function EditorController() {
    sub.SubController.call(this, null);
    this.mainType = 'editor';
    this.id = this.mvelo.getHash();
    this.initText = '';
    this.done = null;
    this.pwdCache = require('../pwdCache');
    this.editorPopup = null;
  }

  EditorController.prototype = Object.create(sub.SubController.prototype);
  EditorController.prototype.parent = sub.SubController.prototype;

  EditorController.prototype.handlePortMessage = function(msg) {
    var that = this;
    switch (msg.event) {
      case 'editor-init':
        this.ports.editor.postMessage({event: 'set-text', text: this.initText});
        break;
      case 'editor-cancel':
        this.editorPopup.window.close();
        this.editorPopup = null;
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  EditorController.prototype.encrypt = function(initText, callback) {
    var that = this;
    this.initText = initText;
    this.done = callback;
    this.mvelo.windows.openPopup('common/ui/modal/editor.html?id=' + this.id + '&editor_type=' + this.prefs.data.general.editor_type, {width: 742, height: 450, modal: false}, function(window) {
      that.editorPopup = window;
    });
  };

  exports.EditorController = EditorController;

});
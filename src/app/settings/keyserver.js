/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2015 Mailvelope GmbH
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

/**
 * @fileOverview Implements the key server configuration ui in the
 * settings dialog
 */

'use strict';

function KeyServer(mvelo, app) {
  this._mvelo = mvelo;
  this._app = app;
}

/**
 * Initialize jQuery elemens and event handlers.
 */
KeyServer.prototype.init = function() {
  // init jquery elements
  this._inputHkpUrl = $('#keyserverInputHkpUrl');
  this._checkBoxTOFU = $('#keyserverCheckBoxMveloTOFULookup');
  this._saveBtn = $('#keyserverBtnSave');
  this._cancelBtn = $('#keyserverBtnCancel');
  this._alert = $('#keyserverAlert');

  // set event handlers
  this._saveBtn.click(this.save.bind(this));
  this._cancelBtn.click(this.cancel.bind(this));
  this._inputHkpUrl.on('input', this.onChangeHkpUrl.bind(this));
  this._checkBoxTOFU.click(this.onChangeTOFU.bind(this));

  // load preferences
  this.loadPrefs();
};

/**
 * Is triggered when the text input for the HKP url changes.
 * @return {Boolean}   If the event was successful
 */
KeyServer.prototype.onChangeHkpUrl = function() {
  this.normalize();
  if (!this.validateUrl(this._inputHkpUrl.val())) {
    this._alert.showAlert(this._app.l10n.alert_header_warning, this._app.l10n.keyserver_url_warning, 'warning', true);
    return false;
  }

  this._saveBtn.prop('disabled', false);
  this._cancelBtn.prop('disabled', false);
};


/**
 * Is triggered when the text input for the HKP url changes.
 * @return {Boolean}   If the event was successful
 */
KeyServer.prototype.onChangeTOFU = function() {
  this.normalize();
  this._saveBtn.prop('disabled', false);
  this._cancelBtn.prop('disabled', false);
};

/**
 * Save the key server settings.
 * @return {Promise}   A promise with an empty result
 */
KeyServer.prototype.save = function() {
  var self = this;
  var opt = self._app;
  var hkpBaseUrl = self._inputHkpUrl.val();
  var tofu = self._checkBoxTOFU.prop('checked');

  return self.testUrl(hkpBaseUrl).then(function() {
    var update = {
      keyserver: {hkp_base_url: hkpBaseUrl, mvelo_tofu_lookup: tofu}
    };
    self._mvelo.extension.sendMessage({event: 'set-prefs', data: update}, function() {
      self.normalize();
      opt.event.triggerHandler('hkp-url-update');
    });

  }).catch(function() {
    self._alert.showAlert(opt.l10n.alert_header_error, opt.l10n.keyserver_url_error, 'danger', true);
  });
};

/**
 * Cancels the configuration and restore original settings.
 * @return {Boolean}   If the event was successful
 */
KeyServer.prototype.cancel = function() {
  this.normalize();
  this.loadPrefs();
  return false;
};

/**
 * Validates a HKP url using a regex.
 * @param  {String} url   The base url of the hkp server
 * @return {Boolean}      If the url is valid
 */
KeyServer.prototype.validateUrl = function(url) {
  var urlPattern = /^(http|https):\/\/[\w-]+(?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?)*\.?$/;
  return urlPattern.test(url);
};

/**
 * Validates a HKP url by query the key server using a well known public key ID.
 * @param  {String} url   The base url of the hkp server
 * @return {Promise}      If the test was valid. Rejects in case of an error.
 */
KeyServer.prototype.testUrl = function(url) {
  if (!this.validateUrl(url)) {
    return Promise.reject(new Error('Invalid url'));
  }

  return new Promise(function(resolve, reject) {
    url += '/pks/lookup?op=get&options=mr&search=0x11A1A9C84B18732F'; // test query info@eff.org
    $.get(url, function(data, statusText, xhr) {
      if (xhr.status === 200) {
        resolve();
      } else {
        reject(new Error('Server not reachable'));
      }
    }).fail(reject);
  });
};

/**
 * Restore default UI state.
 */
KeyServer.prototype.normalize = function() {
  this._alert.empty();
  $('#keyserver .form-group button').prop('disabled', true);
  $('#keyserver .control-group').removeClass('error');
  $('#keyserver .help-inline').addClass('hide');
};

/**
 * Load the user's preferences from local storage.
 * @return {Promise}   Resolves after the preferences have been loaded
 */
KeyServer.prototype.loadPrefs = function() {
  var self = this;
  return self._app.pgpModel('getPreferences').then(function(prefs) {
    self._inputHkpUrl.val(prefs.keyserver.hkp_base_url);
    self._checkBoxTOFU.prop('checked', prefs.keyserver.mvelo_tofu_lookup);
  });
};

//
// bootstraping
//

var mvelo = mvelo || null;
var app = app || null;

(function(mvelo, app) {
  if (!app) { return; }

  app.registerL10nMessages([
    'alert_header_warning',
    'alert_header_error',
    'keyserver_url_warning',
    'keyserver_url_error',
    'keyserver_tofu_label',
    'keyserver_tofu_lookup'
  ]);

  var keyserver = new KeyServer(mvelo, app);
  app.event.on('ready', keyserver.init.bind(keyserver));

}(mvelo, app));

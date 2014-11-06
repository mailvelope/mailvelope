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
 
var mvelo = mvelo || {};

mvelo.DisplayContainer = function(selector) {
  this.selector = selector;
};

mvelo.DisplayContainer.prototype.create = function(armored, done) {
  var element = document.querySelector(this.selector);
  var iframe = document.createElement('iframe');
  iframe.setAttribute('srcdoc', '<pre>' + armored + '</pre>');
  iframe.setAttribute('frameBorder', 0);
  iframe.setAttribute('scrolling', 'no');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  element.appendChild(iframe);
  done();
};
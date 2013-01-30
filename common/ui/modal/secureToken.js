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
  
  var comm = typeof mvelo !== 'undefined' && mvelo.extension || keyRing;

  function init() {
    loadToken();
    if (typeof keyRing !== 'undefined') { 
      keyRing.onUpdate(loadToken);
    }
  }

  function loadToken() {
    comm.sendMessage({event: "get-security-token"}, function(token) {
      //console.log('token', token);
      $('#secureCode').html(token.code)
                      .attr('style', getStyle(token.color));
      $('#secureCode:hidden').fadeIn();
    });
  }

  // Attribution: http://stackoverflow.com/a/6444043
  function increase_brightness(hex, percent){
    // strip the leading # if it's there
    hex = hex.replace(/^\s*#|\s*$/g, '');

    // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
    if(hex.length == 3){
        hex = hex.replace(/(.)/g, '$1$1');
    }

    var r = parseInt(hex.substr(0, 2), 16),
        g = parseInt(hex.substr(2, 2), 16),
        b = parseInt(hex.substr(4, 2), 16);

    return '#' +
       ((0|(1<<8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
  }

  // Attribution: http://24ways.org/2010/calculating-color-contrast/
  function isDark(hex) {
    hex = hex.replace(/^\s*#|\s*$/g, '');
    var r = parseInt(hex.substr(0,2),16);
    var g = parseInt(hex.substr(2,2),16);
    var b = parseInt(hex.substr(4,2),16);
    var yiq = ((r*299)+(g*587)+(b*114))/1000;
    return yiq < 128;
  }

  function getStyle(hex) {
    var normal = hex;
    var bright = increase_brightness(hex, 35);
    var style = 'background-color: ' + normal + ';';
    style += 'background-image: -moz-linear-gradient(top, ' + bright + ', ' + normal + ');';
    style += 'background-image: -webkit-gradient(linear, 0 0, 0 100%, from(' + bright + '), to(' + normal + '));';
    style += 'background-image: -webkit-linear-gradient(top, ' + bright + ', ' + normal + ');';
    style += 'background-image: linear-gradient(to bottom, ' + bright + ', ' + normal + ');';
    if (isDark(normal)) {
      style += 'color: #FFFFFF';
    }
    return style;
  }
  
  $(document).ready(init);
  
}());

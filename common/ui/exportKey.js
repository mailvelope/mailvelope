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

  var grid;

  window.URL = window.URL || window.webkitURL;
  
  function init() {
    $('#mainKeyGrid').one('mainKeyGridReady', function() {
      $("#gridMainToolbar .dropdown-menu").on("click", "li", onExport);
      grid = $(this).data("kendoGrid");
    });
    $('#exportToCb').click(exportToClipboard);
    $('#exportDownload button').click(createFile);
  }

  function onExport() {
    var key = grid.dataItem(grid.select());
    //console.log(key);
    switch (this.id) {
      case 'exportByMail':
        keyRing.sendMessage({
          event: "send-by-mail",
          data: key.toJSON()
        });
        break;
      case 'exportPublic':
        showModal(key, key.armoredPublic, 'pub');
        break;
      case 'exportPrivate':
        if (key.type === 'private') {
          showModal(key, key.armoredPrivate, 'priv');
        }
        break;
      case 'exportKeyPair':
        if (key.type === 'private') {
          showModal(key, key.armoredPrivate + '\n' + key.armoredPublic, 'keypair');
        }
        break;
      default:
        console.log('unknown export action');
    }
    return false;
  }

  function showModal(key, text, fprefix) {
    $('#exportDownload a').addClass('hide');
    $('#armoredKey').val(text);
    var filename = key.name.replace(/\s/g, '_') + '_' + fprefix + '.asc';
    $('#exportDownload input').val(filename);
    $('#exportKey').modal('show');
  }

  function createFile() {
    // release previous url
    var prevUrl = $('#exportDownload a').attr('href');
    if (prevUrl) {
      window.URL.revokeObjectURL(prevUrl);
    }
    // create new
    var blob = new Blob([$('#armoredKey').val()], {type: 'application/pgp-keys'});
    var url = window.URL.createObjectURL(blob);
    $('#exportDownload a').attr('download', $('#exportDownload input').val())
                          .attr('href', url)
                          .removeClass('hide');
  }

  function exportToClipboard() {
    keyRing.copyToClipboard($('#armoredKey').val());
  }
  
  $(document).ready(init);
  
}()); 

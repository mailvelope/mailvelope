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

(function(keyRing) {

  var grid;

  window.URL = window.URL || window.webkitURL;

  keyRing.registerL10nMessages([
    "key_export_too_large",
    "header_warning",
    "key_export_warning_private"
  ]);

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
    var keyid, allKeys;
    if (this.id === 'exportAllKeys') {
      allKeys = true;
    } else if (key) {
      keyid = key.id.toLowerCase();
    } else {
      throw new Error('Invalid export condition');
    }
    var pub = this.id !== 'exportPrivate';
    var priv = this.id === 'exportPrivate' || this.id === 'exportKeyPair' || this.id === 'exportAllKeys';
    var that = this;
    keyRing.viewModel('getArmoredKeys', [[keyid], {pub: pub, priv: priv, all: allKeys}], function(result, error) {
      switch (that.id) {
        case 'exportByMail':
          // keys longer than 1600 chars don't fit into URL
          if (result[0].armoredPublic.length > 1600) {
            showModal(key, result[0].armoredPublic, 'pub', keyRing.l10n.key_export_too_large);
          } else {
            key.armoredPublic = result[0].armoredPublic;
            keyRing.sendMessage({
              event: "send-by-mail",
              data: key.toJSON()
            });
          }
          break;
        case 'exportPublic':
          showModal(key, result[0].armoredPublic, 'pub');
          break;
        case 'exportPrivate':
          if (key.type === 'private') {
            showModal(key, result[0].armoredPrivate, 'priv');
          }
          break;
        case 'exportKeyPair':
          if (key.type === 'private') {
            showModal(key, result[0].armoredPublic + '\n' + result[0].armoredPrivate, 'keypair');
          }
          break;
        case 'exportAllKeys':
          var hasPrivate = false;
          allKeys = result.reduce(function(prev, curr) {
            if (curr.armoredPublic) {
              prev += '\n' + curr.armoredPublic;
            }
            if (curr.armoredPrivate) {
              hasPrivate = true;
              prev += '\n' + curr.armoredPrivate;
            }
            return prev;
          }, '');
          showModal(null, allKeys, 'all_keys', hasPrivate ? '<b>' + keyRing.l10n.header_warning + '</b> ' + keyRing.l10n.key_export_warning_private : null);
          break;
        default:
          console.log('unknown export action');
      }
    });
    return false;
  }

  function showModal(key, text, fprefix, warning) {
    $('#exportDownload a').addClass('hide');
    $('#armoredKey').val(text);
    var filename = '';
    if (key) {
      filename += key.name.replace(/\s/g, '_') + '_';
    }
    filename += fprefix + '.asc';
    $('#exportDownload input').val(filename);
    if (warning) {
      $('#exportWarn').html(warning).show();
    } else {
      $('#exportWarn').hide();
    }
    $('#exportKey').modal({backdrop: 'static',keyboard: false});
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
                          .get(0).click();
  }

  function exportToClipboard() {
    keyRing.copyToClipboard($('#armoredKey').val());
  }

  keyRing.event.on('ready', init);

}(keyRing));

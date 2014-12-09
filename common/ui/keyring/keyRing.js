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

'use strict';

var mvelo = mvelo || null;
var options = options || null;

(function(options) {

  options.registerL10nMessages([
    "keygrid_export",
    "keygrid_display_pub_key",
    "keygrid_send_pub_key",
    "keygrid_display_priv_key",
    "keygrid_display_key_pair",
    "keygrid_display_all_keys",
    "keygrid_sort_type",
    "keygrid_primary_key",
    "keygrid_subkeys",
    "keygrid_no_subkeys",
    "keygrid_user_ids",
    "keygrid_keyid",
    "keygrid_algorithm",
    "keygrid_key_length",
    "keygrid_creation_date",
    "keygrid_creation_date_short",
    "keygrid_expiration_date",
    "keygrid_key_not_expire",
    "keygrid_validity_status",
    "keygrid_status_valid",
    "keygrid_status_invalid",
    "keygrid_key_fingerprint",
    "keygrid_subkeyid",
    "keygrid_userid",
    "keygrid_userid_signatures",
    "keygrid_signer_name",
    "keygrid_user_name",
    "keygrid_user_email",
    "keygrid_delete",
    "keygrid_delete_confirmation",
    "keygrid_all_keys",
    "keygrid_public_keys",
    "keygrid_private_keys",
    "key_export_too_large",
    "header_warning",
    "key_export_warning_private"
  ]);

  var keyTmpl;
  var keyRing;

  var exDateField = {
    type: "date",
    parse: function(value) {
      return kendo.parseDate(value) || options.l10n.keygrid_key_not_expire;
    }
  };

  function init() {
    keyRing = undefined;
    var tableRow;
    var $tableBody = $("#keyRingTable tbody");
    if(keyTmpl === undefined) {
      keyTmpl = $tableBody.html();
    }
    $tableBody.children().remove();

    $('#displayKeys').addClass('spinner');

    options.viewModel('getKeys', function(data) {
      keyRing = data;
      //console.log(JSON.stringify(data));
      keyRing.forEach(function(key){
        tableRow = $.parseHTML(keyTmpl);
        $(tableRow).attr("data-keytype",key.type);
        $(tableRow).find('td:nth-child(2)').text(key.name);
        $(tableRow).find('td:nth-child(3)').text(key.email);
        $(tableRow).find('td:nth-child(4)').text(key.id.substr(-8));
        $(tableRow).find('td:nth-child(5)').text(key.crDate.substr(0,10));
        if(key.type === "private") { // '<img src="../img/#= type #-key.png" alt="#= type #" />'
          $(tableRow).find('.glyphicon-eye-open').remove();
        } else {
          $(tableRow).find('.glyphicon-eye-close').remove();
        }
        $tableBody.append(tableRow);
      });
      mvelo.l10n.localizeHTML();
      $tableBody.find("tr").on("click", function() {
        alert();
      });
      $tableBody.find("tr").hover(function() {
        $(this).find(".btn-group").css("visibility","visible");
      }, function() {
        $(this).find(".btn-group").css("visibility","hidden");
      });
      $('#displayKeys').removeClass('spinner');
    });
  }

  window.URL = window.URL || window.webkitURL;


  function init2() {
    $('#mainKeyGrid').one('mainKeyGridReady', function() {
      $("#gridMainToolbar .dropdown-menu").on("click", "li", onExport);
      //grid = $(this).data("kendoGrid");
    });
    $('#exportToCb').click(exportToClipboard);
    $('#exportDownload button').click(createFile);
  }

  function onExport() {
    var key;// = grid.dataItem(grid.select());
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
    options.viewModel('getArmoredKeys', [[keyid], {pub: pub, priv: priv, all: allKeys}], function(result, error) {
      switch (that.id) {
        case 'exportByMail':
          // keys longer than 1600 chars don't fit into URL
          if (result[0].armoredPublic.length > 1600) {
            showModal(key, result[0].armoredPublic, 'pub', options.l10n.key_export_too_large);
          } else {
            key.armoredPublic = result[0].armoredPublic;
            mvelo.extension.sendMessage({
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
          showModal(null, allKeys, 'all_keys', hasPrivate ? '<b>' + options.l10n.header_warning + '</b> ' + options.l10n.key_export_warning_private : null);
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
    options.copyToClipboard($('#armoredKey').val());
  }

/*  function reload() {
      options.viewModel('getKeys', function(keys) {
      keys.forEach(function(key) {
        key.l10n = options.l10n;
      });
      $("#mainKeyGrid").data("kendoGrid").setDataSource(new kendo.data.DataSource({
        data: keys,
        schema: keyGridSchema,
        change: onDataChange
      }));
    });
  }

  function initGrid(keys) {

    $('#displayKeys').removeClass('spinner');

    initKeyGridColumns();

    keys.forEach(function(key) {
      key.l10n = keyRing.l10n;
    });

    function onRemoveKey(e) {
      keyRing.viewModel('removeKey', [e.model.guid, e.model.type]);
    }

  }

  function loadDetails(e) {
    //console.log('loadDetails')
    e.detailRow.find(".tabstrip").kendoTabStrip({
      animation: {
        open: { effects: "fadeIn" }
      }
    });
    keyRing.viewModel('getKeyDetails', [e.data.guid], function(details) {
      //console.log('keyGrid key details received', details);
      e.data.subkeys = details.subkeys;
      e.data.subkeys.forEach(function(subkey) {
        subkey.l10n = keyRing.l10n;
      });
      e.data.users = details.users;
      detailInit(e);
    });
  }

  */

  options.event.on('ready', init);

}(options));

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
    "keygrid_key_not_expire",
    "keygrid_delete_confirmation"
  ]);

  var keyTmpl;
  var subKeyTmpl;
  var signaturesTmpl;
  var $tableBody;
  var keyRing;
  var filterType;
  window.URL = window.URL || window.webkitURL;

  function initTemplates() {
    if (keyTmpl === undefined) {
      keyTmpl = $("#keyRingTable tbody").html();
    }
    if (subKeyTmpl === undefined) {
      subKeyTmpl = $("#subKeysTab .tab-content").html();
    }
    if (signaturesTmpl === undefined) {
      signaturesTmpl = $("#userIdsTab tbody").html();
    }
  }

  function init() {
    keyRing = undefined;
    var tableRow;
    initTemplates();

    $tableBody = $("#keyRingTable tbody");
    $tableBody.children().remove();

    $('#displayKeys').addClass('spinner');

    options.viewModel('getKeys', function(data) {
      keyRing = data;
      //console.log(JSON.stringify(data));
      //"type":"private",
      //"validity":true,
      //"guid":"8fe0e3926c15175e3a68dd8703c986e66afe22ea",
      //"id":"03C986E66AFE22EA",
      //"fingerprint":"8FE0E3926C15175E3A68DD8703C986E66AFE22EA",
      //"name":"as",
      //"email":"as@as.com",
      //"exDate":false,
      //"crDate":"2014-12-03T13:51:08.000Z",
      //"algorithm":"RSA (Encrypt or Sign)",
      //"bitLength":1024
      keyRing.forEach(function(key) {
        tableRow = $.parseHTML(keyTmpl);
        $(tableRow).attr("data-keytype", key.type);
        $(tableRow).attr("data-keyguid", key.guid);
        $(tableRow).attr("data-keyid", key.id);
        $(tableRow).attr("data-keyname", key.name);
        $(tableRow).attr("data-keyemail", key.email);
        $(tableRow).attr("data-keyalgorithm", key.algorithm);
        $(tableRow).attr("data-keylength", key.bitLength);
        $(tableRow).attr("data-keycreationdate", key.crDate);
        $(tableRow).attr("data-keyexpirationdate", key.exDate);
        $(tableRow).attr("data-keyfingerprint", key.fingerprint);
        $(tableRow).attr("data-keyvalid", key.validity);
        $(tableRow).find('td:nth-child(2)').text(key.name);
        $(tableRow).find('td:nth-child(3)').text(key.email);
        $(tableRow).find('td:nth-child(4)').text(key.id);
        $(tableRow).find('td:nth-child(5)').text(key.crDate.substr(0, 10));
        if (key.type === "private") {
          $(tableRow).find('.publicKey').remove();
        } else {
          $(tableRow).find('.keyPair').remove();
        }
        $tableBody.append(tableRow);
        filterKeys();
      });
      mvelo.l10n.localizeHTML();
      $tableBody.find("tr").on("click", openKeyDetails);
      $tableBody.find("tr").hover(function() {
        $(this).find(".actions").css("visibility", "visible");
      }, function() {
        $(this).find(".actions").css("visibility", "hidden");
      });
      $tableBody.find(".keyDeleteBtn").on("click", deleteKeyEntry);
      $.bootstrapSortable();
      $('#displayKeys').removeClass('spinner');
    });

    $('#exportMenuBtn').click(openExportAllDialog);
    $('#exportToCb2').click(exportToClipboard);
    $('#createExportFile').click(createFile);
    $('#keyringFilterBtn').off();
    $('#keyringFilterBtn').on("change", function() {
      filterType = $(this).val();
      filterKeys();
    });

    options.event.triggerHandler('keygrid-data-change');
  }

  function filterKeys() {
    $tableBody.children().show();
    switch (filterType) {
      case 'publickeys':
        $tableBody.children().get().forEach(function(tableRow) {
          if ($(tableRow).attr("data-keytype") !== "public") {
            $(tableRow).hide();
          }
        });
        break;
      case 'keypairs':
        $tableBody.children().get().forEach(function(tableRow) {
          if ($(tableRow).attr("data-keytype") !== "private") {
            $(tableRow).hide();
          }
        });
        break;
      default:
        //console.log('unknown filter');
        break;
    }
  }

  function openKeyDetails() {
    $("#keyType .publicKey").show();
    $("#keyType .keyPair").show();
    $("#keyInValid").show();
    $("#keyValid").show();
    var $keyData = $(this);
    var keyPair = false;
    options.viewModel('getKeyDetails', [$keyData.attr('data-keyguid')], function(details) {
      //console.log('keyGrid key details received', JSON.stringify(details));
      // Init primary key tab
      $('#keyEditor').attr("data-keyguid", $keyData.attr('data-keyguid'));
      $('#keyId').val($keyData.attr('data-keyid'));
      $('#keyName').val($keyData.attr('data-keyname'));
      $('#keyEmail').val($keyData.attr('data-keyemail'));
      $('#keyAlgorithm').val($keyData.attr('data-keyalgorithm'));
      $('#keyLength').val($keyData.attr('data-keylength'));
      $('#keyCreationDate').val($keyData.attr('data-keycreationdate').substr(0, 10));
      var expirationDate = $keyData.attr('data-keyexpirationdate');
      if (expirationDate === "false") {
        expirationDate = options.l10n.keygrid_key_not_expire;
      } else {
        expirationDate = expirationDate.substr(0, 10);
      }
      $('#keyExpirationDate').val(expirationDate);
      $('#keyFingerPrint').val($keyData.attr('data-keyfingerprint').match(/.{1,4}/g).join(' '));
      if ($keyData.attr('data-keytype') === "private") {
        $("#keyType .publicKey").hide();
        keyPair = true;
      } else {
        $("#keyType .keyPair").hide();
      }
      if ($keyData.attr('data-keyvalid') === 'true') {
        $("#keyInValid").hide();
      } else {
        $("#keyValid").hide();
      }

      // Init subkeys tab
      var subKey;
      var $subKeyContainer = $("#subKeysTab .tab-content");
      $("#subKeysList").children().remove();
      $subKeyContainer.children().remove();
      details.subkeys.forEach(function(subkey, index) {
        $("#subKeysList").append($("<option>")
          .text(subkey.id)
          .attr("id", subkey.id)
        );
        subKey = $.parseHTML(subKeyTmpl);
        $(subKey).attr("id", "tab" + subkey.id);
        if (index === 0) {
          $(subKey).addClass("active");
        }
        $(subKey).find('#subkeyAlgorithm').val(subkey.algorithm);
        $(subKey).find('#subkeyLength').val(subkey.bitLength);
        $(subKey).find('#subkeyCreationDate').val(subkey.crDate.substr(0, 10));
        var expDate = subkey.exDate;
        if (expDate === false) {
          expDate = options.l10n.keygrid_key_not_expire;
        } else {
          expDate = expDate.substr(0, 10);
        }
        $(subKey).find('#subkeyExpirationDate').val(expDate);
        $(subKey).find('#subkeyFingerPrint').val(subkey.fingerprint.match(/.{1,4}/g).join(' '));
        $subKeyContainer.append(subKey);
      });
      $("#subKeysList").off();
      $("#subKeysList").on("change", function() {
        var id = $(this).val();
        $("#subKeysTab .tab-pane").removeClass("active");
        var tabEl = $("#tab" + id);
        tabEl.addClass("active");
      });

      // Init user ids tab
      var signature;
      var $signatureContainer = $("#userIdsTab tbody");
      $signatureContainer.children().remove();
      $("#userIdsList").children().remove();
      details.users.forEach(function(user, index) {
        $("#userIdsList").append($("<option>")
            .text(user.userID)
            .attr("id", user.userID)
        );
        user.signatures.forEach(function(sgn) {
          signature = $.parseHTML(signaturesTmpl);
          $(signature).attr("data-userid", user.userID);
          if (index > 0) {
            $(signature).css("display", "none");
          }
          $(signature).find('td:nth-child(1)').text(sgn.signer);
          $(signature).find('td:nth-child(2)').text(sgn.id);
          $(signature).find('td:nth-child(3)').text(sgn.crDate.substr(0, 10));
          $signatureContainer.append(signature);
        });
      });
      $("#userIdsList").off();
      $("#userIdsList").on("change", function() {
        $signatureContainer.find("tr").css("display", "none");
        $signatureContainer.find("[data-userid='" + $(this).val() + "']").css("display", "table-row");
      });

      // Init export tab
      $("#exportPublic").off();
      $("#exportPrivate").off();
      $("#exportKeyPair").off();
      $("#exportTabSwitch").off();
      $("#exportPublic").on("click", initExportTab);
      $("#exportPrivate").on("click", initExportTab);
      $("#exportKeyPair").on("click", initExportTab);
      $("#exportTabSwitch").on("click", function() {
        $("#exportPublic").get(0).click();
      });

      if (keyPair) {
        $("#exportSwitcher").show();
      } else {
        $("#exportSwitcher").hide();
      }

      $("#primaryKeyTabSwitch").get(0).click();

      // Show modal
      $("#primaryKeyTabSwitch").show();
      $("#subkeysTabSwitch").show();
      $("#userIdTabSwitch").show();
      //$("#exportSwitcher").show();
      $('#keyEditor').modal({backdrop: 'static'});
      $("#keyEditor").modal("show");
    });
  }

  function openExportAllDialog() {
    $("#armoredKey").val("");
    $("#keyName").val("");
    // Show modal
    $("#primaryKeyTabSwitch").hide();
    $("#subkeysTabSwitch").hide();
    $("#userIdTabSwitch").hide();
    $("#exportSwitcher").hide();

    $("#keyDetailsTabSwitcher #exportTabSwitch").tab("show");

    $('#keyEditor').modal({backdrop: 'static'});
    $("#keyEditor").modal("show");
    options.viewModel('getArmoredKeys', [[], {pub: true, priv: true, all: true}], function(result, error) {
      var hasPrivate = false;
      var allKeys = result.reduce(function(prev, curr) {
        if (curr.armoredPublic) {
          prev += '\n' + curr.armoredPublic;
        }
        if (curr.armoredPrivate) {
          hasPrivate = true;
          prev += '\n' + curr.armoredPrivate;
        }
        return prev;
      }, '');
      initExport(allKeys, 'all_keys', hasPrivate ? '<b>' + options.l10n.header_warning + '</b> ' + options.l10n.key_export_warning_private : null);
    });
  }

  function deleteKeyEntry() {
    var $entryForRemove;
    var confirmResult = confirm(options.l10n.keygrid_delete_confirmation);
    if (confirmResult) {
      $entryForRemove = $(this).parent().parent().parent();
      options.viewModel('removeKey', [$entryForRemove.attr('data-keyguid'), $entryForRemove.attr('data-keytype')]);
      init();
    }
    return false;
  }

  function initExportTab() {
    var sourceId = $(this).attr("id");
    var keyid = $('#keyEditor').attr("data-keyguid");
    var allKeys = false;
    var pub = sourceId !== 'exportPrivate';
    var priv = sourceId === 'exportPrivate' || sourceId === 'exportKeyPair' || sourceId === 'exportAllKeys';
    options.viewModel('getArmoredKeys', [[keyid], {pub: pub, priv: priv, all: allKeys}], function(result, error) {
      switch (sourceId) {
        case 'exportPublic':
          initExport(result[0].armoredPublic, 'pub', false);
          break;
        case 'exportPrivate':
          initExport(result[0].armoredPrivate, 'priv', true);
          break;
        case 'exportKeyPair':
          initExport(result[0].armoredPublic + '\n' + result[0].armoredPrivate, 'keypair', true);
          break;
        default:
          $('#exportWarn').hide();
          console.log('unknown export action');
      }
    });
  }

  function initExport(text, fprefix, warning) {
    $('#exportDownload a').addClass('hide');
    $('#armoredKey').val(text);
    var filename = '';
    var keyname = $("#keyName").val();
    if (keyname) {
      filename += keyname.replace(/\s/g, '_') + '_';
    }
    filename += fprefix + '.asc';
    $('#exportDownload input').val(filename);
    if (warning) {
      $('#exportWarn').show();
    } else {
      $('#exportWarn').hide();
    }
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
    $('#exportDownload a')
      .attr('download', $('#exportDownload input').val())
      .attr('href', url)
      .get(0).click();
  }

  function exportToClipboard() {
    options.copyToClipboard($('#armoredKey').val());
  }

  options.event.on('ready', init);

  options.event.on('keygrid-reload', init);

}(options));

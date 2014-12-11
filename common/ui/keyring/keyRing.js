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
    "header_warning",
    "key_export_warning_private"
  ]);

  var keyTmpl;
  var subKeyTmpl;
  var singaturesTmpl;

  var keyRing;

  function initTemplates() {
    if(keyTmpl === undefined) {
      keyTmpl = $("#keyRingTable tbody").html();
    }
    if(subKeyTmpl === undefined) {
      subKeyTmpl = $("#subKeysTab .tab-content").html();
    }
    if(singaturesTmpl === undefined) {
      singaturesTmpl = $("#userIdsTab tbody").html();
    }
  }

  function init() {
    keyRing = undefined;
    var tableRow;
    initTemplates();

    var $tableBody = $("#keyRingTable tbody");
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
      keyRing.forEach(function(key){
        tableRow = $.parseHTML(keyTmpl);
        $(tableRow).attr("data-keytype",key.type);
        $(tableRow).attr("data-keyguid",key.guid);
        $(tableRow).attr("data-keyid",key.id);
        $(tableRow).attr("data-keyname",key.name);
        $(tableRow).attr("data-keyemail",key.email);
        $(tableRow).attr("data-keyalgorithm",key.algorithm);
        $(tableRow).attr("data-keylength",key.bitLength);
        $(tableRow).attr("data-keycreationdate",key.crDate);
        $(tableRow).attr("data-keyexpirationdate",key.exDate);
        $(tableRow).attr("data-keyfingerprint",key.fingerprint);
        $(tableRow).attr("data-keyvalid",key.validity);
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
      $tableBody.find("tr").on("click", openKeyDetails);
      $tableBody.find("tr").hover(function() {
        $(this).find(".actions").css("visibility","visible");
      }, function() {
        $(this).find(".actions").css("visibility","hidden");
      });
      $tableBody.find(".keyDeleteBtn").on("click", deleteKeyEntry);
      $('#displayKeys').removeClass('spinner');
    });

    $('#exportMenuBtn').click(function() {
      $('#exportKeysModal').modal({backdrop: 'static'});
      $("#exportKeysModal").modal("show");
    });
    $('#exportToCb2').click(exportToClipboard);
    $('#createExportFile').click(createFile);
  }

  window.URL = window.URL || window.webkitURL;

  function openKeyDetails() {
    $("#keyPublic").show();
    $("#keyPrivate").show();
    $("#keyInValid").show();
    $("#keyValid").show();
    var $keyData = $(this);
    options.viewModel('getKeyDetails', [$keyData.attr('data-keyguid')], function(details) {
      //console.log('keyGrid key details received', JSON.stringify(details));
      // Init primary key tab
      $('#keyEditor').attr("data-keyguid",$keyData.attr('data-keyguid'));
      $('#keyId').val($keyData.attr('data-keyid'));
      $('#keyName').val($keyData.attr('data-keyname'));
      $('#keyEmail').val($keyData.attr('data-keyemail'));
      $('#keyAlgorithm').val($keyData.attr('data-keyalgorithm'));
      $('#keyLength').val($keyData.attr('data-keylength'));
      $('#keyCreationDate').val($keyData.attr('data-keycreationdate'));
      $('#keyExpirationDate').val($keyData.attr('data-keyexpirationdate'));
      $('#keyFingerPrint').val($keyData.attr('data-keyfingerprint'));
      if($keyData.attr('data-keytype') === "private") { // '<img src="../img/#= type #-key.png" alt="#= type #" />'
        $("#keyPublic").hide();
      } else {
        $("#keyPrivate").hide();
      }
      if($keyData.attr('data-keyvalid') === 'true') {
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
          .attr("id",subkey.id)
        );
        subKey = $.parseHTML(subKeyTmpl);
        $(subKey).attr("id","tab"+subkey.id);
        if(index === 0) {
          $(subKey).addClass("active");
        }
        $(subKey).find('#subkeyAlgorithm').val(subkey.algorithm);
        $(subKey).find('#subkeyLength').val(subkey.bitLength);
        $(subKey).find('#subkeyCreationDate').val(subkey.crDate);
        $(subKey).find('#subkeyExpirationDate').val(subkey.exDate);
        $(subKey).find('#subkeyFingerPrint').val(subkey.fingerprint);
        $subKeyContainer.append(subKey);
      });
      $("#subKeysList").on("change", function() {
        var id = $(this).val();
        $("#subKeysTab .tab-pane").removeClass("active");
        var tabEl = $("#tab"+id);
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
            .attr("id",user.userID)
        );
        user.signatures.forEach(function(sgn){
          signature = $.parseHTML(singaturesTmpl);
          $(signature).attr("data-userid",user.userID);
          if(index > 0) {
            $(signature).css("display","none");
          }
          $(signature).find('td:nth-child(1)').text(sgn.signer);
          $(signature).find('td:nth-child(2)').text(sgn.id);
          $(signature).find('td:nth-child(3)').text(sgn.crDate);
          $signatureContainer.append(signature);
        });
      });
      $("#userIdsList").on("change", function() {
        $signatureContainer.find("tr").css("display","none");
        $signatureContainer.find("[data-userid='"+$(this).val()+"']").css("display","table-row");
      });

      // Init export tab
      $(".exportPublic").on("click",initExportTab);
      $(".exportPrivate").on("click",initExportTab);
      $(".exportKeyPair").on("click",initExportTab);
      $("#exportTabSwitch").on("click",function() {
        $(".exportPublic").get(0).click();
      });

      $("#primaryKeyTabSwitch").get(0).click();

      // Show modal
      $('#keyEditor').modal({backdrop: 'static'});
      $("#keyEditor").modal("show");
    });
  }

  function deleteKeyEntry() {
    var $entryForRemove;
    var confirmResult = confirm("Do you want to delete this key?");
    if(confirmResult) {
      $entryForRemove = $(this).parent().parent().parent();
      options.viewModel('removeKey', [$entryForRemove.attr('data-keyguid'), $entryForRemove.attr('data-keytype')]);
      init();
    }
    return false;
  }

  function initExportTab() {
    $('#exportWarn').hide();
    var sourceId = $(this).attr("data-id");
    var keyid = $('#keyEditor').attr("data-keyguid"); //$("#keyId").val();
    var allKeys = false;
    var pub = sourceId !== 'exportPrivate';
    var priv = sourceId === 'exportPrivate' || sourceId === 'exportKeyPair' || sourceId === 'exportAllKeys';
    options.viewModel('getArmoredKeys', [[keyid], {pub: pub, priv: priv, all: allKeys}], function(result, error) {
      switch (sourceId) {
        case 'exportPublic':
          initExport(result[0].armoredPublic, 'pub');
          break;
        case 'exportPrivate':
          initExport(result[0].armoredPrivate, 'priv');
          break;
        case 'exportKeyPair':
          initExport(result[0].armoredPublic + '\n' + result[0].armoredPrivate, 'keypair');
          break;
        /*case 'exportAllKeys':
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
          break; */
        default:
          console.log('unknown export action');
      }
    });
    return false;
  }

  function initExport(text, fprefix, warning) {
    $('#exportDownload a').addClass('hide');
    $('#armoredKey').val(text);
    $('#armoredKey2').val(text);
    var filename = '';
    var keyname = $("#keyName").val();
    if (keyname) {
      filename += keyname.replace(/\s/g, '_') + '_';
    }
    filename += fprefix + '.asc';
    $('#exportDownload input').val(filename);
    if (warning) {
      $('#exportWarn').html(warning).show();
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
    $('#exportDownload a').attr('download', $('#exportDownload input').val())
      .attr('href', url)
      .get(0).click();
  }

  function exportToClipboard() {
    options.copyToClipboard($('#armoredKey2').val());
  }

  options.event.on('ready', init);

}(options));

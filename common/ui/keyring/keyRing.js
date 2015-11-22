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

'use strict';

var mvelo = mvelo || null;
var options = options || null;

(function(options) {

  options.registerL10nMessages([
    'keygrid_key_not_expire',
    'keygrid_delete_confirmation',
    'keygrid_primary_label',
    'key_set_as_primary'
  ]);

  var keyTmpl;
  var subKeyTmpl;
  var signaturesTmpl;
  var $tableBody;
  var tableRow;
  var keyRing;
  var filterType;
  var $setAsPrimaryBtn;
  var isKeyPair;
  var isKeygridLoaded = false;

  window.URL = window.URL || window.webkitURL;

  function init() {
    //Init templates
    if (keyTmpl === undefined) {
      keyTmpl = $('#keyRingTable tbody').html();
    }
    if (subKeyTmpl === undefined) {
      subKeyTmpl = $('#subKeysTab .tab-content').html();
    }
    if (signaturesTmpl === undefined) {
      signaturesTmpl = $('#userIdsTab tbody').html();
    }

    $setAsPrimaryBtn = $('#setAsPrimaryBtn');

    $('#exportMenuBtn').on('click', openExportAllDialog);
    $('#keyringFilterBtn').on('change', function() {
      filterType = $(this).val();
      filterKeys();
    });

    $('#exportToCb2').on('click', exportToClipboard);
    $('#createExportFile').on('click', createFile);
    $('#exportPublic').on('click', startExport);
    $('#exportPrivate').on('click', startExport);
    $('#exportKeyPair').on('click', startExport);
    $('#exportTabSwitch').on('click', function() {
      $('#exportPublic').get(0).click();
    });

    if (!isKeygridLoaded) {
      reload();
      isKeygridLoaded = true;
    }
  }

  function reload() {
    $tableBody = $('#keyRingTable tbody');

    options.getAllKeyringAttr()
      .then(function(result) {
        if (result !== undefined) {
          options.primaryKeyId = undefined;
          for (var keyRingId in result) {
            var obj = result[keyRingId];
            if (obj.hasOwnProperty('primary_key')) {
              if (options.keyringId === keyRingId) {
                options.primaryKeyId = obj.primary_key;
              }
            }
          }
        }

        options.keyring('getKeys')
          .then(initKeyringTable);
      });
  }

  function initKeyringTable(result) {
    var $displayKeys = $('#displayKeys');
    if (result === undefined) {
      mvelo.util.hideLoadingAnimation($displayKeys);
    }
    $tableBody.empty();
    result.forEach(function(key) {
      tableRow = $.parseHTML(keyTmpl);
      $(tableRow).attr('data-keytype', key.type);
      $(tableRow).attr('data-keyguid', key.guid);
      $(tableRow).attr('data-keyid', key.id);
      $(tableRow).attr('data-keyname', key.name);
      $(tableRow).attr('data-keyemail', key.email);
      $(tableRow).attr('data-keyalgorithm', key.algorithm);
      $(tableRow).attr('data-keylength', key.bitLength);
      $(tableRow).attr('data-keycreationdate', key.crDate);
      $(tableRow).attr('data-keyexpirationdate', key.exDate);
      $(tableRow).attr('data-keyfingerprint', key.fingerprint);
      $(tableRow).attr('data-keyvalid', key.validity);
      $(tableRow).attr('data-keyisprimary', false);
      $(tableRow).find('td:nth-child(2)').text(key.name);
      if (options.primaryKeyId === key.id) {
        $(tableRow).attr('data-keyisprimary', true);
        $(tableRow).find('td:nth-child(2)').append('&nbsp;&nbsp;<span class="label label-warning" data-l10n-id="keygrid_primary_label"></span>');
      }
      $(tableRow).find('td:nth-child(3)').text(key.email);
      $(tableRow).find('td:nth-child(4)').text(key.id);
      $(tableRow).find('td:nth-child(5)').text(key.crDate.substr(0, 10));
      if (key.type === 'private') {
        $(tableRow).find('.publicKey').remove();
      } else {
        $(tableRow).find('.keyPair').remove();
      }
      $tableBody.append(tableRow);
      filterKeys();
    });
    mvelo.l10n.localizeHTML();
    $tableBody.find('tr').on('click', openKeyDetails);
    $tableBody.find('tr').hover(function() {
      $(this).find('.actions').css('visibility', 'visible');
    }, function() {
      $(this).find('.actions').css('visibility', 'hidden');
    });
    $tableBody.find('.keyDeleteBtn').on('click', deleteKeyEntry);
    $.bootstrapSortable();
    mvelo.util.hideLoadingAnimation($displayKeys);
  }

  function filterKeys() {
    $tableBody.children().show();
    switch (filterType) {
      case 'publickeys':
        $tableBody.children().get().forEach(function(tableRow) {
          if ($(tableRow).attr('data-keytype') !== 'public') {
            $(tableRow).hide();
          }
        });
        break;
      case 'keypairs':
        $tableBody.children().get().forEach(function(tableRow) {
          if ($(tableRow).attr('data-keytype') !== 'private') {
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
    $('#keyType .publicKey').show();
    $('#keyType .keyPair').show();
    $('#keyInValid').show();
    $('#keyValid').show();
    var $keyData = $(this);
    isKeyPair = false;

    initPrimaryKeyTab($keyData);

    options.keyring('getKeyDetails', [$keyData.attr('data-keyguid')])
      .then(function(result) {
        var details = result;
        initSubKeysTab(details);

        initUserIdsTab(details);

        if (isKeyPair) {
          $('#exportSwitcher').show();
        } else {
          $('#exportSwitcher').hide();
        }

        $('#primaryKeyTabSwitch').get(0).click();

        // Show modal
        $('#primaryKeyTabSwitch').show();
        $('#subkeysTabSwitch').show();
        $('#userIdTabSwitch').show();
        $('#keyEditor').modal({backdrop: 'static'}).modal('show');
      });
  }

  function initPrimaryKeyTab($keyData) {
    $('#keyEditor').attr('data-keyguid', $keyData.attr('data-keyguid'));
    $('#keyId').val($keyData.attr('data-keyid'));
    $('#keyName').val($keyData.attr('data-keyname'));
    $('#keyEmail').val($keyData.attr('data-keyemail'));
    $('#keyAlgorithm').val($keyData.attr('data-keyalgorithm'));
    $('#keyLength').val($keyData.attr('data-keylength'));
    $('#keyCreationDate').val($keyData.attr('data-keycreationdate').substr(0, 10));
    var expirationDate = $keyData.attr('data-keyexpirationdate');
    if (expirationDate === 'false') {
      expirationDate = options.l10n.keygrid_key_not_expire;
    } else {
      expirationDate = expirationDate.substr(0, 10);
    }
    $('#keyExpirationDate').val(expirationDate);
    $('#keyFingerPrint').val($keyData.attr('data-keyfingerprint').match(/.{1,4}/g).join(' '));
    if ($keyData.attr('data-keytype') === 'private') {
      $('#keyType .publicKey').hide();
      isKeyPair = true;
      $setAsPrimaryBtn.show();
      if ($keyData.attr('data-keyisprimary') === 'true') {
        $setAsPrimaryBtn.prop('disabled', true);
        $setAsPrimaryBtn.addClass('btn-warning');
        $setAsPrimaryBtn.text(options.l10n.keygrid_primary_label);
        $setAsPrimaryBtn.removeAttr('data-primarykeyid');
      } else {
        $setAsPrimaryBtn.removeClass('btn-warning');
        $setAsPrimaryBtn.prop('disabled', false);
        $setAsPrimaryBtn.attr('data-primarykeyid', $keyData.attr('data-keyid'));
        $setAsPrimaryBtn.append($('<span>')).text(options.l10n.key_set_as_primary);
        $setAsPrimaryBtn.prepend('<span class="glyphicon glyphicon-pushpin" aria-hidden="true"></span>&nbsp;');
      }
      $setAsPrimaryBtn.off();
      $setAsPrimaryBtn.on('click', setPrimaryKey);
    } else {
      $('#keyType .keyPair').hide();
      $setAsPrimaryBtn.hide();
    }
    if ($keyData.attr('data-keyvalid') === 'true') {
      $('#keyInValid').hide();
    } else {
      $('#keyValid').hide();
    }
  }

  function initSubKeysTab(details) {
    var subKey;
    var $subKeyContainer = $('#subKeysTab .tab-content');
    $('#subKeysList').children().remove();
    $subKeyContainer.children().remove();
    details.subkeys.forEach(function(subkey, index) {
      $('#subKeysList').append($('<option>')
          .text(subkey.id)
          .attr('id', subkey.id)
      );
      subKey = $.parseHTML(subKeyTmpl);
      $(subKey).attr('id', 'tab' + subkey.id);
      if (index === 0) {
        $(subKey).addClass('active');
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
    $('#subKeysList').off();
    $('#subKeysList').on('change', function() {
      var id = $(this).val();
      $('#subKeysTab .tab-pane').removeClass('active');
      var tabEl = $('#tab' + id);
      tabEl.addClass('active');
    });
  }

  function initUserIdsTab(details) {
    var signature;
    var $signatureContainer = $('#userIdsTab tbody');
    $signatureContainer.children().remove();
    $('#userIdsList').children().remove();
    details.users.forEach(function(user, index) {
      $('#userIdsList').append($('<option>')
          .text(user.userID)
          .attr('id', user.userID)
      );
      user.signatures.forEach(function(sgn) {
        signature = $.parseHTML(signaturesTmpl);
        $(signature).attr('data-userid', user.userID);
        if (index > 0) {
          $(signature).css('display', 'none');
        }
        $(signature).find('td:nth-child(1)').text(sgn.signer);
        $(signature).find('td:nth-child(2)').text(sgn.id);
        $(signature).find('td:nth-child(3)').text(sgn.crDate.substr(0, 10));
        $signatureContainer.append(signature);
      });
    });
    $('#userIdsList').off();
    $('#userIdsList').on('change', function() {
      $signatureContainer.find('tr').css('display', 'none');
      $signatureContainer.find('[data-userid="' + $(this).val() + '"]').css('display', 'table-row');
    });
  }

  function setPrimaryKey() {
    var primaryKeyId = $(this).attr('data-primarykeyid');
    if (primaryKeyId) {
      options.setKeyringAttr(options.keyringId, {
        primary_key: primaryKeyId
      });
      $(this).addClass('btn-warning');
      $(this).text(options.l10n.keygrid_primary_label);
      $(this).prop('disabled', true);
      $(this).removeAttr('data-primarykeyid');
      options.primaryKeyId = primaryKeyId;
      options.event.triggerHandler('keygrid-reload');
    } else {
      return false;
    }
  }

  function openExportAllDialog() {
    $('#armoredKey').val('');
    $('#keyName').val('');
    // Show modal
    $('#primaryKeyTabSwitch').hide();
    $('#subkeysTabSwitch').hide();
    $('#userIdTabSwitch').hide();
    $('#exportSwitcher').hide();
    $setAsPrimaryBtn.hide();

    $('#keyDetailsTabSwitcher #exportTabSwitch').tab('show');

    $('#exportToCb2').off();
    $('#exportToCb2').click(exportToClipboard);
    $('#createExportFile').off();
    $('#createExportFile').click(createFile);

    $('#keyEditor').modal({backdrop: 'static'});
    $('#keyEditor').modal('show');
    options.keyring('getArmoredKeys', [[], {pub: true, priv: true, all: true}])
      .then(function(result) {
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
      options.keyring('removeKey', [$entryForRemove.attr('data-keyguid'), $entryForRemove.attr('data-keytype')]);
      options.event.triggerHandler('keygrid-reload');
    }
    return false;
  }

  function startExport() {
    var sourceId = $(this).attr('id');
    var keyid = $('#keyEditor').attr('data-keyguid');
    var allKeys = false;
    var pub = sourceId !== 'exportPrivate';
    var priv = sourceId === 'exportPrivate' || sourceId === 'exportKeyPair' || sourceId === 'exportAllKeys';
    options.keyring('getArmoredKeys', [[keyid], {pub: pub, priv: priv, all: allKeys}])
      .then(function(result) {
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
    var keyname = $('#keyName').val();
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

  options.deleteKeyring = function() {
    var keyRingId = $(this).attr('data-keyringid');
    if (confirm('Do you want to remove the keyring with id: ' + keyRingId + ' ?')) {
      mvelo.extension.sendMessage({
        event: 'delete-keyring',
        keyringId: keyRingId
      });
      options.reloadOptions();
    }
  };

  options.createKeyring = function(keyRingId, callback) {
    mvelo.extension.sendMessage({
      event: 'create-keyring',
      keyringId: keyRingId
    }, function() {
      console.log('Create keyring');
    });
  };

  options.setKeyringAttr = function(keyRingId, keyRingAttr, callback) {
    mvelo.extension.sendMessage({
      event: 'set-keyring-attr',
      keyringId: keyRingId,
      keyringAttr: keyRingAttr
    }, function() {
      console.log('Set keyring attr');
    });
  };

  options.event.on('ready', init);

  options.event.on('keygrid-reload', reload);

}(options));

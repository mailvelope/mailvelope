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

  var keyGridColumns;

  function initKeyGridColumns() {
    keyGridColumns = [
      {
        field: "type",
        title: " ",
        width: 30,
        template: '<img src="../img/#= type #-key.png" alt="#= type #" />'
      },
      {
        field: "name",
        title: keyRing.l10n.keygrid_user_name
      },
      {
        field: "email",
        title: keyRing.l10n.keygrid_user_email
      },
      {
        field: "id",
        width: 100,
        title: keyRing.l10n.keygrid_keyid,
        template: '#= id.substr(-8) #',
        attributes: {
          style: "font-family: monospace;"
        }
      },
      {
        field: "crDate",
        width: 90,
        title: keyRing.l10n.keygrid_creation_date_short,
        template: '#= kendo.toString(crDate,"dd.MM.yyyy") #'
      },
      {
        command: { text: keyRing.l10n.keygrid_delete, name: "destroy" },
        title: " ",
        width: "100px"
      }
    ];
  }

  keyRing.registerL10nMessages([
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
    "keygrid_signer_keyid",
    "keygrid_user_name",
    "keygrid_user_email",
    "keygrid_delete",
    "keygrid_delete_confirmation",
    "keygrid_all_keys",
    "keygrid_public_keys",
    "keygrid_private_keys"
  ]);

  var exDateField = {
    type: "date",
    parse: function(value) {
      return kendo.parseDate(value) || keyRing.l10n.keygrid_key_not_expire;
    }
  };

  var keyGridSchema = {
    model: {
      fields: {
        type: { type: "string" },
        name: { type: "string" },
        email: { type: "string" },
        id: { type: "string" },
        crDate: { type: "date" },
        exDate: exDateField
      }
    }
  };

  var subKeySchema = {
    model: {
      fields: {
        crDate: { type: "date" },
        exDate: exDateField
      }
    }
  };

  var signerSchema = {
    model: {
      fields: {
        signer: { type: "string" },
        id: { type: "string" },
        crDate: { type: "date" }
      }
    }
  };

  function init() {
    $('#displayKeys').addClass('spinner');
    keyRing.viewModel('getKeys', initGrid);
    keyRing.event.on('keygrid-reload', reload);
  }

  function reload() {
    keyRing.viewModel('getKeys', function(keys) {
      keys.forEach(function(key) {
        key.l10n = keyRing.l10n;
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

    var grid = $("#mainKeyGrid").kendoGrid({
      columns: keyGridColumns,
      dataSource: {
        data: keys,
        schema: keyGridSchema,
        change: onDataChange
      },
      detailTemplate: kendo.template($("#keyDetails").html()),
      detailInit: loadDetails,
      selectable: "row",
      sortable: {
        mode: "multiple", // enables multi-column sorting
        allowUnsort: true
      },
      toolbar: kendo.template($("#keyToolbar").html())(keyRing.l10n),
      editable: {
        update: false,
        destroy: true,
        confirmation: keyRing.l10n.keygrid_delete_confirmation,
      },
      remove: onRemoveKey,
      change: onGridChange
    });

    function onRemoveKey(e) {
      keyRing.viewModel('removeKey', [e.model.guid, e.model.type]);
    }

    grid.find("#keyType").kendoDropDownList({
      dataTextField: "text",
      dataValueField: "value",
      autoBind: false,
      optionLabel: keyRing.l10n.keygrid_all_keys,
      dataSource: [
        { text: keyRing.l10n.keygrid_public_keys, value: "public" },
        { text: keyRing.l10n.keygrid_private_keys, value: "private" }
      ],
      change: onDropDownChange
    });

    $("#mainKeyGrid").triggerHandler('mainKeyGridReady');

    function onDropDownChange() {
      var value = this.value();
      if (value) {
        grid.data("kendoGrid").dataSource.filter({ field: "type", operator: "eq", value: value });
      } else {
        grid.data("kendoGrid").dataSource.filter({});
      }
    }

    function onGridChange(e) {
      var selected = this.select();
      if (selected.length !== 0) {
        var selKey = grid.data("kendoGrid").dataItem(selected);
        if (selKey.type === 'public') {
          $('#exportPrivate, #exportKeyPair').addClass('disabled');
        } else {
          $('#exportPrivate, #exportKeyPair').removeClass('disabled');
        }
        $('#exportPublic, #exportByMail').removeClass('disabled');
      } else {
        $('#exportPublic, #exportByMail, #exportPrivate, #exportKeyPair').addClass('disabled');
      }
    }

  }

  function onDataChange(e) {
    // selection is lost on data change, therefore reset export buttons
    $('#exportPublic, #exportByMail, #exportPrivate, #exportKeyPair').addClass('disabled');
    keyRing.event.triggerHandler('keygrid-data-change');
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

  function detailInit(e) {
    //console.log('detailInit');
    var detailRow = e.detailRow;

    var subkeyID = detailRow.find(".subkeyID").kendoDropDownList({
      dataTextField: "id",
      dataValueField: "id",
      dataSource: {
        data: e.data.subkeys,
        schema: subKeySchema
      },
      select: onSubkeySelect,
      index: 0
    });

    var template = kendo.template($("#subkeyDetails").html());
    var subkeyDetails = detailRow.find(".subkeyDetails");
    var firstSubKey = subkeyID.data("kendoDropDownList").dataItem(0); // e.data.subkeys[0] can't be used as dates are not mapped
    if (firstSubKey) {
      subkeyDetails.html(template(firstSubKey));
    } else {
      subkeyDetails.html('<li>' + keyRing.l10n.keygrid_no_subkeys + '</li>');
    }

    function onSubkeySelect(e) {
      var dataItem = this.dataItem(e.item.index());
      subkeyDetails.html(template(dataItem));
    }

    var useridDdl = detailRow.find(".userID");

    useridDdl.width(300);
    useridDdl.kendoDropDownList({
      dataTextField: "userID",
      dataValueField: "userID",
      dataSource: e.data.users,
      select: onUserSelect,
      index: 0
    });

    detailRow.find(".signerGrid").kendoGrid({
      columns: [
        {
          field: "signer",
          title: keyRing.l10n.keygrid_signer_name
        },
        {
          field: "id",
          width: 150,
          title: keyRing.l10n.keygrid_signer_keyid
        },
        {
          field: "crDate",
          width: 90,
          title: keyRing.l10n.keygrid_creation_date_short,
          template: '#= kendo.toString(crDate,"dd.MM.yyyy") #'
        }
      ],
      dataSource: {
        data: e.data.users[0].signatures,
        schema: signerSchema
      },
      sortable: true,
    });

    var signerGrid = detailRow.find(".signerGrid").data("kendoGrid");

    function onUserSelect(e) {
      var dataItem = this.dataItem(e.item.index());
      // not working as dates don't get formated:
      //signerGrid.dataSource.data(dataItem.signatures);
      signerGrid.setDataSource(new kendo.data.DataSource({
        data: dataItem.signatures,
        schema: signerSchema
      }));
    }

  }

  keyRing.event.on('ready', init);

}(keyRing));

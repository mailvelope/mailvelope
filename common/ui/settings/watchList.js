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
options.watchList = {};

(function(exports, options) {

  /**
   * remove duplicates from array, last duplicate entry wins
   * @param  {array of objects} unordered
   * @param  {string} key
   * @return {array}
   */
  var objectDeDup = function(unordered, key) {
    var result = [];
    var object = {};
    unordered.forEach(function(item) {
      object[item[key]] = item;
    });
    for (var prop in object) {
      if (object.hasOwnProperty(prop)) {
        result.push(object[prop]);
      }
    }
    return result;
  };

  options.registerL10nMessages([
    "watchlist_title_active",
    "watchlist_title_site",
    "watchlist_title_scan",
    "watchlist_title_frame",
    "watchlist_expose_api",
    "watchlist_command_edit",
    "watchlist_command_create",
    "watchlist_command_save",
    "watchlist_command_cancel",
    "keygrid_delete"
  ]);

  var mailProviderTmpl;
  var siteData;

  function init() {
    siteData = undefined;
    var tableRow;
    var $tableBody = $("#watchListTable tbody");
    if(mailProviderTmpl === undefined) {
      mailProviderTmpl = $tableBody.html();
    }
    $tableBody.children().remove();
    options.viewModel('getWatchList', function(data) {
      siteData = data;
      data.forEach(function(site){
        tableRow = $.parseHTML(mailProviderTmpl);
        $(tableRow).find('td:nth-child(2)').text(site.site);
        if(!site.active) {
          $(tableRow).find(".glyphicon-check").removeClass("glyphicon-check").addClass("glyphicon-unchecked");
        }
        $tableBody.append(tableRow);
      });
      mvelo.l10n.localizeHTML();
      $tableBody.find(".editWatchListBtn").on("click", function(e) {
        showWatchListEditor();
        return false;
      });
      $tableBody.find(".deleteWatchListBtn").on("click", deleteWatchListEntry);
      $tableBody.find("tr").on("click", function() {
        showWatchListEditor();
      });
      $tableBody.find("tr").hover(function() {
        $(this).find(".btn-group").css("visibility","visible");
      }, function() {
        $(this).find(".btn-group").css("visibility","hidden");
      });
    });
  }

  function deleteWatchListEntry() {
    var entryForRemove;
    var confirmResult = confirm("Do you want to delete this entry?");
    if(confirmResult) {
      entryForRemove = $(this).parent().parent().parent();
      entryForRemove.remove();
      //saveData();
      // init();
    }
    return false;
  }

  function showWatchListEditor() {
    var $watchListEditor = $("#watchListEditor");

    $watchListEditor.modal("show");
  }

  function saveWatchListData() {
    var data;
    options.sendMessage({
      event: "set-watch-list",
      data: data
    });
  }

  /*

  function detailInit(e) {
    var masterRow = e;
    // create new datasource for frame list
    var frameList = new kendo.data.DataSource({
      data: e.data.frames && e.data.frames.toJSON ? e.data.frames.toJSON() : e.data.frames,
      schema: framesSchema
    });
    $("<div/>").appendTo(e.detailCell).kendoGrid({
      dataSource: frameList,
      sortable: true,
      columns: framesColumns,
      toolbar: [
        { text: keyRing.l10n.watchlist_command_create, name: "create" },
        { text: keyRing.l10n.watchlist_command_save, name: "save" },
        { text: keyRing.l10n.watchlist_command_cancel, name: "cancel" }
      ],
      editable: {
        update: true,
        destroy: true,
        confirmation: false
      },
      navigatable: true,
      saveChanges: updateFrames
    });
    function updateFrames() {
      var frames = frameList.data().toJSON();
      watchListData.getByUid(masterRow.data.uid).set('frames', frames);
      setWatchListData();
    }
  }

  exports.addSite = function(site, hosts) {
    var item = {};
    item.active = true;
    item.site = site;
    item.frames = hosts.map(function(host) {
      return {scan: true, frame: host, api: false};
    });
    if (watchListData) {
      updateWatchListData(item);
    } else {
      $("#watchListGrid").one('watchListDataReady', updateWatchListData.bind(undefined, item));
    }
  };

  function updateWatchListData(item) {
    var entry = watchListData.get(item.site);
    if (entry) {
      var newAndOld = item.frames.concat(entry.toJSON().frames);
      var unique = objectDeDup(newAndOld, 'frame');
      // this updates watchListData
      entry.set('frames', unique);
    } else {
      entry = watchListData.insert(0, item);
    }
    setWatchListData();
    var grid = mainGrid.data("kendoGrid");
    var row = grid.tbody.find(">tr[data-uid='" + entry.uid + "']");
    grid.select(row);
    grid.expandRow(row);
  }

  exports.removeSite = function(site) {
    if (watchListData) {
      removeWatchListItem(site);
    } else {
      $("#watchListGrid").one('watchListDataReady', function() {
        mainGrid.data("kendoGrid").saveChanges();
        removeWatchListItem(site);
      });
    }
  };

  function removeWatchListItem(site) {
    var entry = watchListData.get(site);
    if (entry) {
      var grid = mainGrid.data("kendoGrid");
      var row = grid.tbody.find(">tr[data-uid='" + entry.uid + "']");
      grid.select(row);
      // timeout required to show grid below confirmation box
      setTimeout(function() {
        grid.removeRow(row);
      }, 200);
    } else {
      setTimeout(function() {
        alert('Site ' + site + ' is not in the watch list.');
      }, 200);
    }
  } */

  options.event.on('ready', init);

}(options.watchList, options));

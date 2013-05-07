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

var watchList = {};

(function(exports) {
  
  var watchListColumns = [
      {
        field: "active",
        title: "Active",
        width: 50,
        template: '<div class="checkb-active"><input type="checkbox" disabled="disabled" #= active ? \'checked="checked"\' : "" # /></div>'
      },
      {
        field: "site",
        title: "Site"
      },
      { 
        command: ["edit", "destroy"], 
        title: " ", 
        width: "180px" 
      }];
      
  var watchListSchema = {
        model: {
          id: "site",
          fields: {
            active: { type: "boolean" },
            site: { 
              type: "string", 
              validation: { required: true } 
            },
          }
        }
      };

  var framesColumns = [
      {
        field: "scan",
        title: "Scan",
        width: 50
      },
      {
        field: "frame",
        title: "Frame"
      },
      { 
        command: ["destroy"], 
        title: " ", 
        width: "100px" 
      }];
      
  var framesSchema = {
        model: {
          id: "frame",
          fields: {
            scan: { type: "boolean" },
            frame: { 
              type: "string",
              validation: { required: true } 
            }
          }
        }
      };
   
  var watchListData;
  var mainGrid;

  function init() {
    keyRing.viewModel('getWatchList', initGrid);
  }

  function initGrid(watchList) {
    watchListData = new kendo.data.DataSource({
      data: watchList,
      schema: watchListSchema,
      change: function(e) {
        //console.log('change: ', e);
        if (e.action === 'remove') {
          setWatchListData();
        }
      }
    });
    mainGrid = $("#watchListGrid").kendoGrid({
      columns: watchListColumns,
      dataSource: watchListData,
      detailInit: detailInit,
      sortable: true,
      selectable: "row",
      editable: "inline",
      toolbar: ["create"],
      save: setWatchListData
    });  
    $("#watchListGrid").triggerHandler('watchListDataReady');
  }

  function setWatchListData() {
    var data = watchListData.data().toJSON();
    keyRing.sendMessage({
      event: "set-watch-list",
      data: data
    });
  }
      
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
      toolbar: ["create", "save", "cancel"],
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
      return {scan: true, frame: host};
    });
    if (watchListData) {
      updateWatchListData(item);
    } else {
      $("#watchListGrid").one('watchListDataReady', updateWatchListData.bind(undefined, item));
    }
  }

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
  }

  exports.removeSite = function(site) {
    if (watchListData) {
      removeWatchListItem(site);
    } else {
      $("#watchListGrid").one('watchListDataReady', (function() {
        mainGrid.data("kendoGrid").saveChanges();
        removeWatchListItem(site);
      }).bind(this));
    }
  }

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
        alert('Site ' + site + ' is not in the watch list.' );
      }, 200);
    }
  }

  $(document).ready(init);
       
}(watchList)); 

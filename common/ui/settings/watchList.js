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

  var $watchListEditor;
  var mailProviderTmpl;
  var matchPatternTmpl;
  var $matchPatternContainer;
  var siteData;
  var $tableBody;
  var currentSiteID;
  var newWebSite;

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
    "watchlist_delete_confirmation",
    "alert_invalid_domainmatchpattern_warning",
    "alert_no_domainmatchpattern_warning",
    "keygrid_delete"
  ]);

  function init() {
    $tableBody = $("#watchListTable tbody");
    $watchListEditor = $("#watchListEditor");
    if (mailProviderTmpl === undefined) {
      mailProviderTmpl = $tableBody.html();
    }

    $matchPatternContainer = $("#watchListEditor tbody");
    if (matchPatternTmpl === undefined) {
      matchPatternTmpl = $matchPatternContainer.html();
    }
    $matchPatternContainer.children().remove();

    reloadWatchList();

    $("#okWatchListEditorBtn").on("click", saveWatchList);
    $("#addMatchPatternBtn").on("click", addMatchPattern);
    $("#addMailProviderBtn").on("click", showWatchListEditor);

    $("#watchListEditor form").on("submit", function() { return false; });
  }

  function reloadWatchList() {
    siteData = undefined;
    var tableRow;
    $tableBody.children().remove();
    options.viewModel('getWatchList', function(data) {
      // console.log("Watchlist: "+JSON.stringify(data));
      // {"site":"server.lan","active":true,"frames":[{"frame":"*.server.lan","scan":true}]},
      siteData = data;
      data.forEach(function(site) {
        tableRow = $.parseHTML(mailProviderTmpl);
        $(tableRow).find('td:nth-child(2)').text(site.site);
        if (!site.active) {
          $(tableRow).find(".glyphicon-check").removeClass("glyphicon-check").addClass("glyphicon-unchecked");
        }
        $(tableRow).attr("data-website", JSON.stringify(site));
        $tableBody.append(tableRow);
      });
      mvelo.l10n.localizeHTML();
      $tableBody.find(".deleteWatchListBtn").on("click", deleteWatchListEntry);
      $tableBody.find("tr").on("click", function() {
        var data = $(this).attr("data-website");
        showWatchListEditor(data);
        return false;
      });
      $tableBody.find("tr").hover(function() {
        $(this).find(".actions").css("visibility", "visible");
      }, function() {
        $(this).find(".actions").css("visibility", "hidden");
      });

      if (newWebSite !== undefined) {
        var $selectedRow = $("td:contains('" + newWebSite + "')").parent();
        $selectedRow.addClass("addedSiteFade");
        $selectedRow.trigger("hover");
        window.scrollTo(0, document.body.scrollHeight);
        newWebSite = undefined;
      }

    });
  }

  function addMatchPattern() {
    var tableRow = $.parseHTML(matchPatternTmpl);
    $(tableRow).find('.matchPatternSwitch .onoffswitch-checkbox').attr("checked", true);
    $(tableRow).find('.apiSwitch .onoffswitch-checkbox').attr("checked", false);
    var id = (new Date()).getTime();
    $(tableRow).find('.matchPatternSwitch .onoffswitch-checkbox').attr("id", "matchPattern" + id);
    $(tableRow).find('.matchPatternSwitch .onoffswitch-label').attr("for", "matchPattern" + id);
    id = (new Date()).getTime();
    $(tableRow).find('.apiSwitch .onoffswitch-checkbox').attr("id", "api" + id);
    $(tableRow).find('.apiSwitch .onoffswitch-label').attr("for", "api" + id);
    $(tableRow).find('.matchPatternName').val("");
    $(tableRow).find(".deleteMatchPatternBtn").on("click", deleteMatchPattern);
    $matchPatternContainer.append(tableRow);
  }

  function deleteMatchPattern() {
    $(this).parent().parent().remove();
  }

  function showWatchListEditor(data) {
    // console.log("website data: "+data);
    // {"site":"server.lan","active":true,"frames":[{"frame":"*.server.lan","scan":true}]},
    currentSiteID = "newSite";
    $matchPatternContainer.children().remove();
    var tableRow;
    if (data !== undefined && data.type === "click") {
      $("#webSiteName").val("");
      $("#switchWebSite").attr("checked", true);
      tableRow = $.parseHTML(matchPatternTmpl);
      addMatchPattern();
    } else if (data !== undefined) {
      data = JSON.parse(data);
      currentSiteID = data.site;
      $("#webSiteName").val(data.site);
      $("#switchWebSite").attr("checked", data.active);
      data.frames.forEach(function(frame, index) {
        tableRow = $.parseHTML(matchPatternTmpl);
        $(tableRow).find('.matchPatternSwitch .onoffswitch-checkbox').attr("checked", frame.scan);
        $(tableRow).find('.matchPatternSwitch .onoffswitch-checkbox').attr("id", "matchPattern" + index);
        $(tableRow).find('.matchPatternSwitch .onoffswitch-label').attr("for", "matchPattern" + index);
        $(tableRow).find('.apiSwitch .onoffswitch-checkbox').attr("checked", frame.api);
        $(tableRow).find('.apiSwitch .onoffswitch-checkbox').attr("id", "api" + index);
        $(tableRow).find('.apiSwitch .onoffswitch-label').attr("for", "api" + index);
        $(tableRow).find('.matchPatternName').val(frame.frame);
        $(tableRow).find(".deleteMatchPatternBtn").on("click", deleteMatchPattern);
        $matchPatternContainer.append(tableRow);
      });
    }
    $watchListEditor.modal({backdrop: 'static'});
    $watchListEditor.modal("show");
  }

  function deleteWatchListEntry() {
    var entryForRemove;
    var confirmResult = confirm(options.l10n.watchlist_delete_confirmation);
    if (confirmResult) {
      entryForRemove = $(this).parent().parent().parent();
      entryForRemove.remove();
      var data = [];
      $tableBody.children().get().forEach(function(siteRow) {
        var siteData = JSON.parse($(siteRow).attr("data-website"));
        data.push(siteData);
      });
      saveWatchListData(data);
    }
    return false;
  }

  function saveWatchList() {
    var $form = $("#watchListEditor form");
    var site = {};
    site.site = $("#webSiteName").val();
    site.active = $("#switchWebSite").is(":checked");
    site.frames = [];
    var formNotValid;
    $matchPatternContainer.children().get().forEach(function(child) {
      var patternValue = $(child).find(".matchPatternName").val();
      if (!/^\*(\.\w+(-\w+)*)+(\.\w{2,})?$/.test(patternValue)) {
        formNotValid = true;
      }
      site.frames.push({
        "frame": $(child).find(".matchPatternName").val(),
        "scan": $(child).find(".matchPatternSwitch .onoffswitch-checkbox").is(":checked"),
        "api": $(child).find(".apiSwitch .onoffswitch-checkbox").is(":checked")
      });
    });
    if (formNotValid) {
      alert(options.l10n.alert_invalid_domainmatchpattern_warning);
      return false;
    }
    if (site.frames.length < 1) {
      alert(options.l10n.alert_no_domainmatchpattern_warning);
      return false;
    }

    if (currentSiteID === "newSite") {
      var tableRow = $.parseHTML(mailProviderTmpl);
      $(tableRow).find('td:nth-child(2)').text(site.site);
      if (site.acitve) {
        $(tableRow).find(".glyphicon-check").removeClass("glyphicon-check").addClass("glyphicon-unchecked");
      }
      $(tableRow).attr("data-website", JSON.stringify(site));
      $tableBody.append(tableRow);
    } else {
      $tableBody.children().get().forEach(function(siteRow) {
        var sData = JSON.parse($(siteRow).attr("data-website"));
        if (currentSiteID === sData.site) {
          $(siteRow).find('td:nth-child(2)').text(site.site);
          if (site.acitve) {
            $(siteRow).find(".glyphicon-check").removeClass("glyphicon-check").addClass("glyphicon-unchecked");
          }
          $(siteRow).attr("data-website", JSON.stringify(site));
        }
      });
    }

    var data = [];
    $tableBody.children().get().forEach(function(siteRow) {
      var siteData = JSON.parse($(siteRow).attr("data-website"));
      data.push(siteData);
    });
    saveWatchListData(data);
    $watchListEditor.modal("hide");

  }

  function cleanWebSiteName(website) {
    if (website.indexOf("www.") === 0) {
      website = website.substr(4, website.length);
    }
    return website;
  }

  function addToWatchList(website) {
    //console.log("Adding to watchlist: "+website);
    var siteExist = false;
    var site = {};
    website = cleanWebSiteName(website);
    newWebSite = website;
    site.site = website;
    site.active = true;
    site.frames = [];
    site.frames.push({ frame: "*." + website, scan:true });
    options.viewModel('getWatchList', function(data) {
      data.forEach(function(siteEntry, index) {
        if (siteEntry.site === website) {
          siteExist = true;
        }
      });
      if (!siteExist) {
        data.push(site);
      }
      saveWatchListData(data);
    });
  }
  options.addToWatchList = addToWatchList;

  function removeFromWatchList(website) {
    if (confirm(options.l10n.watchlist_delete_confirmation)) {
      website = cleanWebSiteName(website);
      options.viewModel('getWatchList', function(data) {
        data.forEach(function(siteEntry, index) {
          if (siteEntry.site === website) {
            data.splice(index, 1);
          }
        });
        saveWatchListData(data);
      });
    }
  }
  options.removeFromWatchList = removeFromWatchList;

  function saveWatchListData(data) {
    //console.log("website data: "+JSON.stringify(data));
    mvelo.extension.sendMessage({
      event: "set-watch-list",
      data: data
    });
    reloadWatchList();
  }

  options.event.on('ready', init);

}(options));

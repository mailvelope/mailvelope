/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {port, getAppDataSlot} from '../app';
import * as l10n from '../../lib/l10n';

import './watchList.css';
import WatchListEditor from './components/watchListEditor';

l10n.register([
  'settings_watchlist',
  'watchlist_command_create',
  'watchlist_title_active',
  'watchlist_title_site',
  'watchlist_command_edit',
  'keygrid_delete',
  'watchlist_delete_confirmation',
  'alert_invalid_domainmatchpattern_warning',
  'alert_no_domainmatchpattern_warning'
]);

export default class WatchList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      watchList: [],
      editorSite: null,
      editorIndex: null,
      modified: false
    };
    this.handleChangeSite = this.handleChangeSite.bind(this);
    this.handleChangeFrame = this.handleChangeFrame.bind(this);
  }

  componentDidMount() {
    this.loadWatchList()
    .then(() => {
      // watchlist push scenario
      if (/\/push$/.test(this.props.location.pathname)) {
        getAppDataSlot()
        .then(site => this.addToWatchList(site));
      }
    });
  }

  loadWatchList() {
    return port.send('getWatchList')
    .then(watchList => this.setState({watchList}));
  }

  saveWatchListData() {
    port.emit('set-watch-list', {data: this.state.watchList});
  }

  showWatchListEditor(index) {
    this.setState(prevState => ({
      editorSite: this.copySite(prevState.watchList[index]),
      editorIndex: index
    }));
  }

  copySite(site) {
    const copy = {...site};
    copy.frames = [...site.frames || []];
    return copy;
  }

  deleteWatchListEntry(event, index) {
    event.stopPropagation();
    const confirmResult = confirm(l10n.map.watchlist_delete_confirmation);
    if (confirmResult) {
      this.setState(prevState => {
        const newList = [...prevState.watchList];
        newList.splice(index, 1);
        return {watchList: newList};
      }, () => this.saveWatchListData());
    }
  }

  addWatchListEntry() {
    this.setState(prevState => ({
      editorSite: {site: '', active: true, https_only: true, frames: [{scan: true, frame: '', api: false}]},
      editorIndex: prevState.watchList.length
    }));
  }

  /* Watchlist Editor Handlers */

  handleHideWatchListEditor() {
    this.setState({editorSite: null, editorIndex: null, modified: false});
  }

  handleSaveWatchListEditor() {
    if (!this.state.modified) {
      return this.setState({editorSite: null});
    }
    if (this.state.editorSite.frames.some(frame => !/^\*(\.\w+(-\w+)*)+(\.\w{2,})?$/.test(frame.frame))) {
      alert(l10n.map.alert_invalid_domainmatchpattern_warning);
      return;
    }
    if (this.state.editorSite.frames.length < 1) {
      alert(l10n.map.alert_no_domainmatchpattern_warning);
      return;
    }
    this.setState(prevState => {
      const newList = [...prevState.watchList];
      newList[prevState.editorIndex] = prevState.editorSite;
      return {watchList: newList, editorSite: null};
    }, () => this.saveWatchListData());
  }

  handleChangeSite(key, value) {
    this.modifyEditorSite(site => site[key] = value);
  }

  handleChangeFrame(change, index) {
    this.modifyEditorSite(site => {
      if (!site.frames[index]) {
        site.frames[index] = {};
      }
      Object.assign(site.frames[index], change);
    });
  }

  modifyEditorSite(modify) {
    this.setState(prevState => {
      const site = this.copySite(prevState.editorSite);
      modify(site);
      return {
        editorSite: site,
        modified: true
      };
    });
  }

  handleAddMatchPattern() {
    this.modifyEditorSite(site => site.frames.push({scan: true, frame: '', api: false}));
  }

  handleDeleteMatchPattern(index) {
    this.modifyEditorSite(site => site.frames.splice(index, 1));
  }

  addToWatchList(website) {
    if (website.indexOf('www.') === 0) {
      website = website.substr(4);
    }
    this.setState(prevState => {
      let watchListIndex;
      const site = prevState.watchList.find((site, index) => {
        watchListIndex = index;
        return site.site === website;
      });
      if (site) {
        return {
          editorSite: this.copySite(site),
          editorIndex: watchListIndex,
          modified: false
        };
      } else {
        return {
          editorSite: {site: website, active: true, frames: [{scan: true, frame: `*.${website}`, api: false}]},
          editorIndex: prevState.watchList.length,
          modified: true
        };
      }
    });
  }

  render() {
    return (
      <div>
        <h3>{l10n.map.settings_watchlist}</h3>
        <div className="tableToolbar">
          <button type="button" onClick={() => this.addWatchListEntry()} className="btn btn-default">
            <span className="glyphicon glyphicon-plus"></span>&nbsp;<span>{l10n.map.watchlist_command_create}</span>
          </button>
        </div>
        <table className="table table-hover table-striped optionsTable" id="watchListTable">
          <thead>
            <tr>
              <th>{l10n.map.watchlist_title_active}</th>
              <th style={{width: '60%'}}>{l10n.map.watchlist_title_site}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            { this.state.watchList.map((site, index) =>
              <tr key={index} onClick={() => this.showWatchListEditor(index)}>
                <td className="text-center"><span className={`glyphicon glyphicon-${site.active ? 'check' : 'unchecked'}`}></span></td>
                <td>{site.site}</td>
                <td className="text-center">
                  <div className="actions">
                    <button type="button" className="btn btn-default editWatchListBtn" style={{marginRight: '5px'}}><span className="glyphicon glyphicon-pencil"></span>&nbsp;<span>{l10n.map.watchlist_command_edit}</span></button>
                    <button type="button" onClick={e => this.deleteWatchListEntry(e, index)} className="btn btn-default deleteWatchListBtn"><span className="glyphicon glyphicon-trash"></span>&nbsp;<span>{l10n.map.keygrid_delete}</span></button>
                  </div>
                </td>
              </tr>
            )
            }
          </tbody>
        </table>
        { this.state.editorSite &&
          <WatchListEditor site={this.state.editorSite}
            onHide={() => this.handleHideWatchListEditor()}
            onSave={() => this.handleSaveWatchListEditor()}
            onChangeSite={this.handleChangeSite}
            onChangeFrame={this.handleChangeFrame}
            onAddMatchPattern={() => this.handleAddMatchPattern()}
            onDeleteMatchPattern={index => this.handleDeleteMatchPattern(index)}
          />
        }
      </div>
    );
  }
}

WatchList.propTypes = {
  location: PropTypes.object
};

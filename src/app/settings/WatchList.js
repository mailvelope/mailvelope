/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {port, getAppDataSlot} from '../app';
import * as l10n from '../../lib/l10n';
import SimpleDialog from '../../components/util/SimpleDialog';
import WatchListEditor from './components/watchListEditor';

l10n.register([
  'keygrid_delete',
  'settings_watchlist',
  'watchlist_command_create',
  'watchlist_command_edit',
  'watchlist_delete_confirmation',
  'watchlist_remove_dialog_title',
  'watchlist_title_active',
  'watchlist_title_site',
]);

export default class WatchList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      watchList: [],
      editorSite: null,
      editorIndex: null,
      modified: false,
      showEditor: false,
      errors: {}
    };
    this.handleChangeSite = this.handleChangeSite.bind(this);
    this.handleChangeFrame = this.handleChangeFrame.bind(this);
    this.handleDeleteWatchListEntry = this.handleDeleteWatchListEntry.bind(this);
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
      editorIndex: index,
      showEditor: true
    }));
  }

  copySite(site) {
    const copy = {...site};
    copy.frames = [...site.frames || []];
    return copy;
  }

  handleDeleteWatchListEntry() {
    this.setState(prevState => {
      const newList = [...prevState.watchList];
      newList.splice(prevState.editorIndex, 1);
      return {watchList: newList, showDeleteModal: false};
    }, () => this.saveWatchListData());
  }

  addWatchListEntry() {
    this.setState(prevState => ({
      editorSite: {site: '', active: true, https_only: true, frames: [{scan: true, frame: '', api: false}]},
      editorIndex: prevState.watchList.length,
      showEditor: true
    }));
  }

  /* Watchlist Editor Handlers */

  handleHideWatchListEditor() {
    this.setState({editorSite: null, editorIndex: null, modified: false});
  }

  handleSaveWatchListEditor() {
    const errors = {};
    for (const [index, value] of this.state.editorSite.frames.entries()) {
      if (!/^\*(\.\w+(-\w+)*)+(\.\w{2,})?$/.test(value.frame)) {
        errors[`frame${index}`] = new Error();
      }
    }

    if (this.state.editorSite.frames.length < 1) {
      errors.frames = new Error();
    }

    if (Object.keys(errors).length) {
      this.setState({errors});
      return;
    }

    this.setState(prevState => {
      const newList = [...prevState.watchList];
      newList[prevState.editorIndex] = prevState.editorSite;
      return {watchList: newList, showEditor: false};
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
        modified: true,
        errors: {}
      };
    });
  }

  handleAddMatchPattern() {
    this.modifyEditorSite(site => site.frames.push({scan: true, frame: '', api: false}));
  }

  handleDeleteMatchPattern(index) {
    this.modifyEditorSite(site => site.frames.splice(index, 1));
  }

  addToWatchList({domain, protocol}) {
    if (domain.startsWith('www.')) {
      domain = domain.substr(4);
    }
    this.setState(prevState => {
      let watchListIndex;
      const site = prevState.watchList.find((site, index) => {
        watchListIndex = index;
        return site.site === domain;
      });
      if (site) {
        return {
          editorSite: this.copySite(site),
          editorIndex: watchListIndex,
          modified: false,
          showEditor: true
        };
      } else {
        return {
          editorSite: {site: domain, active: true, https_only: protocol === 'https' ? true : false, frames: [{scan: true, frame: `*.${domain}`, api: false}]},
          editorIndex: prevState.watchList.length,
          modified: true,
          showEditor: true
        };
      }
    });
  }

  render() {
    return (
      <div id="watchlist">
        <h2 className="mb-4">{l10n.map.settings_watchlist}</h2>
        <div className="form-group">
          <button type="button" onClick={() => this.addWatchListEntry()} className="btn btn-secondary">
            <span className="icon icon-add" aria-hidden="true"></span> {l10n.map.watchlist_command_create}
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-hover table-custom mb-0" id="watchListTable">
            <thead>
              <tr>
                <th className="text-center">{l10n.map.watchlist_title_active}</th>
                <th className="w-100">{l10n.map.watchlist_title_site}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {this.state.watchList.map((site, index) =>
                <tr key={index} onClick={() => this.showWatchListEditor(index)}>
                  <td className="text-center"><span className={`icon icon-marker text-${site.active ? 'success' : 'danger'}`} aria-hidden="true"></span></td>
                  <td>{site.site}</td>
                  <td className="text-center">
                    <div className="actions">
                      <button type="button" onClick={e => { e.stopPropagation(); this.setState({showDeleteModal: true, editorIndex: index}); }} className="btn btn-secondary"><span className="icon icon-delete" aria-hidden="true"></span></button>
                      <span className="icon icon-arrow-right" aria-hidden="true"></span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <SimpleDialog
          isOpen={this.state.showDeleteModal}
          toggle={() => this.setState(prevState => ({showDeleteModal: !prevState.showDeleteModal}))}
          onHide={() => this.setState({editorIndex: null})}
          title={l10n.map.watchlist_remove_dialog_title}
          message={l10n.map.watchlist_delete_confirmation}
          onOk={this.handleDeleteWatchListEntry}
          onCancel={() => this.setState({showDeleteModal: false})}
        />
        <WatchListEditor isOpen={this.state.showEditor} toggle={() => this.setState(prevState => ({showEditor: !prevState.showEditor}))} site={this.state.editorSite} errors={this.state.errors}
          onHide={() => this.handleHideWatchListEditor()}
          onCancel={() => this.setState({showEditor: false, errors: {}})}
          onSave={() => this.handleSaveWatchListEditor()}
          onChangeSite={this.handleChangeSite}
          onChangeFrame={this.handleChangeFrame}
          onAddMatchPattern={() => this.handleAddMatchPattern()}
          onDeleteMatchPattern={index => this.handleDeleteMatchPattern(index)}
        />
      </div>
    );
  }
}

WatchList.propTypes = {
  location: PropTypes.object
};

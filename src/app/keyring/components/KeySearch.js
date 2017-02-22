/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import event from '../../util/event';
import React from 'react';

import {pgpModel, openTab} from '../../app';

'use strict';

l10n.register([
  'key_import_hkp_search',
  'key_import_hkp_search_public',
  'key_import_hkp_search_btn',
  'key_import_hkp_search_ph'
]);

const KEY_ID_REGEX = /^([0-9a-f]{8}|[0-9a-f]{16}|[0-9a-f]{40})$/i;

class KeySearch extends React.Component {
  constructor(props) {
    super(props);
    this.HKP_SERVER_BASE_URL = '';
    this.query = null;
    this.handleKeySearch = this.handleKeySearch.bind(this);
    this.hkpUrlLoad();
    event.on('hkp-url-update', () => this.hkpUrlLoad());
  }

  hkpUrlLoad() {
    pgpModel('getPreferences').then(prefs => {
      this.HKP_SERVER_BASE_URL = prefs.keyserver.hkp_base_url;
    });
  }

  handleKeySearch(event) {
    event.preventDefault();
    let query = this.query.value;
    query = KEY_ID_REGEX.test(query) ? ('0x' + query) : query; // prepend '0x' to query for key IDs
    let url = this.HKP_SERVER_BASE_URL + '/pks/lookup?op=index&search=' + window.encodeURIComponent(query);
    openTab(url);
  }

  render() {
    return (
      <form className="form" onSubmit={this.handleKeySearch}>
        <div className="form-group">
          <label className="control-label" htmlFor="keySearchInput"><h4>{l10n.map.key_import_hkp_search}</h4></label>
          <div className="label-subtitle">{l10n.map.key_import_hkp_search_public}</div>
          <div className="input-group">
            <input id="keySearchInput" type="text" ref={query => this.query = query} className="form-control" placeholder={l10n.map.key_import_hkp_search_ph} />
            <span className="input-group-btn">
              <button className="btn btn-default" type="submit">{l10n.map.key_import_hkp_search_btn}</button>
            </span>
          </div>
        </div>
      </form>
    );
  }
}

export default KeySearch;

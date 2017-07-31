/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import React from 'react';
import PropTypes from 'prop-types';
import {Link} from 'react-router-dom';

import {openTab} from '../../app';

'use strict';

l10n.register([
  'key_import_hkp_search',
  'key_import_hkp_search_public',
  'key_import_hkp_search_btn',
  'key_import_hkp_search_ph',
  'key_import_hkp_server',
  'change_link'
]);

const KEY_ID_REGEX = /^([0-9a-f]{8}|[0-9a-f]{16}|[0-9a-f]{40})$/i;

export default class KeySearch extends React.Component {
  constructor(props) {
    super(props);
    this.query = null;
    this.handleKeySearch = this.handleKeySearch.bind(this);
  }

  handleKeySearch(event) {
    event.preventDefault();
    let query = this.query.value;
    query = KEY_ID_REGEX.test(query) ? ('0x' + query) : query; // prepend '0x' to query for key IDs
    let url = this.props.prefs.keyserver.hkp_base_url + '/pks/lookup?op=index&search=' + window.encodeURIComponent(query);
    if (url.includes('keys.mailvelope.com')) {
      url = url.replace('op=index', 'op=get');
    }
    openTab(url);
  }

  render() {
    const hkp_base_url = this.props.prefs && this.props.prefs.keyserver.hkp_base_url;
    const hkp_domain = hkp_base_url && hkp_base_url.replace(/https?:\/\//, '');
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
          <div className="label-subtitle" style={{marginTop: '5px', marginBottom: '5px'}}>
            {l10n.map.key_import_hkp_server} <a target="_blank" rel="noreferrer" href={hkp_base_url}>{hkp_domain}</a> (<Link to="/settings/key-server"><em>{l10n.map.change_link}</em></Link>)
          </div>
        </div>
      </form>
    );
  }
}

KeySearch.propTypes = {
  prefs: PropTypes.object
}

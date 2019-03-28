/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import React from 'react';
import PropTypes from 'prop-types';
import {Link} from 'react-router-dom';

import {port} from '../../app';

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
    query = KEY_ID_REGEX.test(query) ? (`0x${query}`) : query; // prepend '0x' to query for key IDs
    let url = `${this.props.prefs.keyserver.hkp_base_url}/pks/lookup?op=index&search=${window.encodeURIComponent(query)}`;
    if (url.includes('keys.mailvelope.com')) {
      url = url.replace('op=index', 'op=get');
    }
    port.emit('open-tab', {url});
  }

  render() {
    const hkp_base_url = this.props.prefs && this.props.prefs.keyserver.hkp_base_url;
    const hkp_domain = hkp_base_url && hkp_base_url.replace(/https?:\/\//, '');
    return (
      <form className="form" onSubmit={this.handleKeySearch}>
        <div className={`form-group ${this.props.className || ''}`}>
          <div className="input-group">
            <input id="keySearchInput" type="text" className="form-control" ref={query => this.query = query} placeholder={l10n.map.key_import_hkp_search_ph} aria-describedby="keySearchInputHelpBlock" />
            <div className="input-group-append">
              <button className="btn btn-secondary" type="submit">{l10n.map.key_import_hkp_search_btn}</button>
            </div>
          </div>
          <span id="keySearchInputHelpBlock" className="form-text">
            {l10n.map.key_import_hkp_server} <a target="_blank" rel="noopener noreferrer" href={hkp_base_url}>{hkp_domain}</a> (<Link to="/settings/key-server"><em>{l10n.map.change_link}</em></Link>)
          </span>
        </div>
      </form>
    );
  }
}

KeySearch.propTypes = {
  prefs: PropTypes.object,
  className: PropTypes.string
};

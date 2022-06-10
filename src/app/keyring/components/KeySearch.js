/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {Link} from 'react-router-dom';

import * as l10n from '../../../lib/l10n';
import Alert from '../../../components/util/Alert';
import {checkEmail} from '../../../lib/util';
import {port} from '../../app';

l10n.register([
  'change_link',
  'key_import_search_btn',
  'key_import_search_disabled',
  'key_import_search_disabled_descr',
  'key_import_search_invalid',
  'key_import_search_not_found',
  'key_import_search_not_found_header',
  'key_import_search_ph',
  'settings_keyserver'
]);

const KEY_ID_REGEX = /^(0x)?([0-9a-f]{16})$/;
const FINGERPRINT_REGEX = /^(0x)?([0-9a-f]{40})$/;

export default function KeySearch(props) {
  const [query, setQuery] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [notFound, setNotFound] = useState(false);

  function handleInputChange(event) {
    setQuery(event.target.value);
    setInvalid(false);
    setNotFound(false);
  }

  async function handleKeySearch(event) {
    event.preventDefault();
    let search = query.replaceAll(/\s/g, '').toLowerCase();
    setQuery(search);
    if (checkEmail(search)) {
      search = {email: search};
    } else if (KEY_ID_REGEX.test(search)) {
      search = {keyId: search};
    } else if (FINGERPRINT_REGEX.test(search)) {
      search = {fingerprint: search};
    } else {
      setInvalid(true);
      return;
    }
    const key = await port.send('key-lookup', {query: search, latest: true, externalOnly: true});
    if (!key) {
      setNotFound(true);
      return;
    }
    props.onKeyFound(key);
  }

  const noKeySource = props.sourceLabels.length === 0;
  return (
    <form onSubmit={handleKeySearch}>
      <div className="form-group">
        <div className="input-group">
          <input type="text" className={`form-control ${invalid || notFound ? 'is-invalid' : ''}`} value={query} placeholder={l10n.map.key_import_search_ph} aria-describedby="keySearchInputHelpBlock" onChange={handleInputChange} autoFocus disabled={noKeySource} />
          <div className="input-group-append">
            <button className="btn btn-primary" type="submit" disabled={noKeySource}>{l10n.map.key_import_search_btn}</button>
          </div>
        </div>
        <div className={invalid ? 'invalid-feedback d-block' : 'd-none'}>{l10n.map.key_import_search_invalid}</div>
      </div>
      <div className="form-group">
        {notFound && <Alert header={l10n.map.key_import_search_not_found_header} type="danger" className="mb-0">{l10n.map.key_import_search_not_found}</Alert>}
      </div>
      <div id="keySearchInputHelpBlock" className="form-text text-muted">
        <u>{l10n.map.settings_keyserver}</u> <small>(<Link to="/settings/key-server"><em>{l10n.map.change_link}</em></Link>)</small>
        <ul className="mb-0">
          {props.sourceLabels.map((source, index) =>
            <li key={index}><a target="_blank" rel="noopener noreferrer" href={source.url}>{source.label}</a></li>
          )}
          {noKeySource && <Alert header={l10n.map.key_import_search_disabled} type="warning" className="mb-0">{l10n.map.key_import_search_disabled_descr}</Alert>}
        </ul>
      </div>
    </form>
  );
}

KeySearch.propTypes = {
  onKeyFound: PropTypes.func.isRequired,
  sourceLabels: PropTypes.array.isRequired
};

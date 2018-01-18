/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';

import ModalDialog from '../../../components/util/ModalDialog';
import OnOffSwitch from './OnOffSwitch';

l10n.register([
  'watchlist_record_title',
  'watchlist_title_active',
  'watchlist_title_site',
  'watchlist_title_scan',
  'watchlist_title_frame',
  'watchlist_expose_api',
  'keygrid_delete',
  'form_ok',
  'form_cancel'
]);

export default function WatchListEditor(props) {
  return (
    <ModalDialog title={l10n.map.watchlist_record_title} onHide={props.onHide} hide={props.hide} footer={
      <EditorFooter onAddMatchPattern={props.onAddMatchPattern} onSave={props.onSave} />
    }>
      <div>
        <form className="form-horizontal" role="form">
          <div className="form-group">
            <label htmlFor="switchWebSite" className="col-sm-2 control-label">{l10n.map.watchlist_title_active}</label>
            <div className="col-sm-10">
              <OnOffSwitch checked={props.site.active} onChange={e => props.onChangeSite('active', e.target.checked)} id={'switchWebSite'} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="webSiteName" className="col-sm-2 control-label">{l10n.map.watchlist_title_site}</label>
            <div className="col-sm-10">
              <input type="text" value={props.site.site} onChange={e => props.onChangeSite('site', e.target.value)} className="form-control" id="webSiteName" placeholder="e.g. GMX or GMail" />
            </div>
          </div>
          <table className="table table-hover table-condensed table-striped optionsTable" id="watchList">
            <thead>
              <tr>
                <th>{l10n.map.watchlist_title_scan}</th>
                <th>{l10n.map.watchlist_title_frame}</th>
                <th>{l10n.map.watchlist_expose_api}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              { props.site.frames.map((frame, index) =>
                <tr key={index}>
                  <td>
                    <OnOffSwitch checked={frame.scan} onChange={e => props.onChangeFrame({scan: e.target.checked}, index)} id={`frame_scan${index}`} />
                  </td>
                  <td className="form-group">
                    <input type="text" value={frame.frame} onChange={e => props.onChangeFrame({frame: e.target.value}, index)} className="form-control matchPatternName" placeholder="e.g.: *.gmx.de" />
                  </td>
                  <td>
                    <OnOffSwitch checked={frame.api} onChange={e => props.onChangeFrame({api: e.target.checked}, index)} id={`frame_api${index}`} />
                  </td>
                  <td className="text-center">
                    <button type="button" onClick={() => props.onDeleteMatchPattern(index)} className="btn btn-default deleteMatchPatternBtn">
                      <span className="glyphicon glyphicon-trash"></span>&nbsp;<span>{l10n.map.keygrid_delete}</span>
                    </button>
                  </td>
                </tr>
              )
              }
            </tbody>
          </table>
        </form>
      </div>
    </ModalDialog>
  );
}

WatchListEditor.propTypes = {
  site: PropTypes.object.isRequired,
  onAddMatchPattern: PropTypes.func,
  onDeleteMatchPattern: PropTypes.func,
  onHide: PropTypes.func,
  hide: PropTypes.bool,
  onSave: PropTypes.func,
  onChangeSite: PropTypes.func,
  onChangeFrame: PropTypes.func
};

function EditorFooter(props) {
  return (
    <div>
      <button type="button" onClick={props.onAddMatchPattern} className="btn btn-warning pull-left">
        <span className="glyphicon glyphicon-plus"></span>&nbsp;<span>{l10n.map.watchlist_title_frame}</span>
      </button>
      <button type="button" className="btn btn-default" data-dismiss="modal">
        <span className="glyphicon glyphicon-remove" aria-hidden="true"></span>&nbsp;<span>{l10n.map.form_cancel}</span>
      </button>
      <button type="button" onClick={props.onSave} className="btn btn-primary">
        <span className="glyphicon glyphicon-ok" aria-hidden="true"></span>&nbsp;<span>{l10n.map.form_ok}</span>
      </button>
    </div>
  );
}

EditorFooter.propTypes = {
  onAddMatchPattern: PropTypes.func,
  onSave: PropTypes.func
};

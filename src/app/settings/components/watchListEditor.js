/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';

import Modal from '../../../components/util/Modal';

l10n.register([
  'watchlist_record_title',
  'watchlist_title_active',
  'watchlist_title_site',
  'watchlist_title_scan',
  'watchlist_title_frame',
  'watchlist_expose_api',
  'watchlist_title_https_only',
  'keygrid_delete',
  'form_ok',
  'form_cancel'
]);

export default function WatchListEditor(props) {
  return (
    <Modal isOpen={props.isOpen} toggle={props.toggle} title={l10n.map.watchlist_record_title} onHide={props.onHide} footer={
      <EditorFooter onAddMatchPattern={props.onAddMatchPattern} onSave={props.onSave} onCancel={props.onCancel} />
    }>
      {props.site &&
        <div>
          <form role="form">
            <div className="form-group">
              <div className="custom-control custom-switch">
                <input type="checkbox" className="custom-control-input" onChange={e => props.onChangeSite('active', e.target.checked)} id="switchWebSite" checked={props.site.active} />
                <label className="custom-control-label" htmlFor="switchWebSite">{l10n.map.watchlist_title_active}</label>
              </div>
            </div>
            <div>
              <label htmlFor="webSiteName">{l10n.map.watchlist_title_site}</label>
              <div className="d-flex flex-wrap align-items-center align-content-stretch">
                <input type="text" value={props.site.site} onChange={e => props.onChangeSite('site', e.target.value)} className="form-group form-control w-auto flex-grow-1 mr-2" id="webSiteName" placeholder="e.g. GMX or GMail" />
                <div className="form-group custom-control custom-switch">
                  <input type="checkbox" className="custom-control-input" onChange={e => props.onChangeSite('https_only', e.target.checked)} id="switchHttpsOnly" checked={props.site.https_only} />
                  <label className="custom-control-label text-nowrap" htmlFor="switchHttpsOnly">{l10n.map.watchlist_title_https_only}</label>
                </div>
              </div>
            </div>
            <table className="table table-custom table-sm table-hover border-bottom-0 mb-0" id="watchList">
              <thead>
                <tr>
                  <th>{l10n.map.watchlist_title_scan}</th>
                  <th>{l10n.map.watchlist_title_frame}</th>
                  <th>{l10n.map.watchlist_expose_api}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {props.site.frames.map((frame, index) =>
                  <tr key={index}>
                    <td>
                      <div className="custom-control custom-switch">
                        <input type="checkbox" className="custom-control-input" onChange={e => props.onChangeFrame({scan: e.target.checked}, index)} id={`frame_scan${index}`} checked={frame.scan} />
                        <label className="custom-control-label" htmlFor={`frame_scan${index}`} />
                      </div>
                    </td>
                    <td className="w-100">
                      <input type="text" value={frame.frame} onChange={e => props.onChangeFrame({frame: e.target.value}, index)} className="form-control matchPatternName w-100" placeholder="e.g.: *.gmx.de" />
                    </td>
                    <td>
                      <div className="custom-control custom-switch">
                        <input type="checkbox" className="custom-control-input" onChange={e => props.onChangeFrame({api: e.target.checked}, index)} id={`frame_api${index}`} checked={frame.api} />
                        <label className="custom-control-label" htmlFor={`frame_api${index}`} />
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="actions">
                        <button type="button" onClick={() => props.onDeleteMatchPattern(index)} className="btn btn-sm btn-secondary deleteMatchPatternBtn text-nowrap">
                          <span className="icon icon-delete" aria-hidden="true"></span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </form>
        </div>
      }
    </Modal>
  );
}

WatchListEditor.propTypes = {
  site: PropTypes.object,
  onAddMatchPattern: PropTypes.func,
  onDeleteMatchPattern: PropTypes.func,
  onHide: PropTypes.func,
  onCancel: PropTypes.func,
  toggle: PropTypes.func,
  hide: PropTypes.bool,
  onSave: PropTypes.func,
  onChangeSite: PropTypes.func,
  onChangeFrame: PropTypes.func,
  isOpen: PropTypes.bool
};

function EditorFooter(props) {
  return (
    <div className="modal-footer">
      <div className="d-flex w-100">
        <button type="button" onClick={props.onAddMatchPattern} className="btn btn-secondary mr-auto">
          <span className="icon icon-add" aria-hidden="true"></span> {l10n.map.watchlist_title_frame}
        </button>
        <button type="button" onClick={props.onCancel} className="btn btn-secondary mr-1">
          {l10n.map.form_cancel}
        </button>
        <button type="button" onClick={props.onSave} className="btn btn-primary">
          {l10n.map.form_ok}
        </button>
      </div>
    </div>
  );
}

EditorFooter.propTypes = {
  onAddMatchPattern: PropTypes.func,
  onSave: PropTypes.func,
  onCancel: PropTypes.func
};

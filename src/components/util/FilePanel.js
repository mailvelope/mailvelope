/**
 * Copyright (C) 2017-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';
import Alert from './Alert';
import {extractFileExtension, extractFileNameWithoutExt} from '../../lib/file';

import './FilePanel.scss';

l10n.register([
  'decrypt_open_viewer_btn_title',
  'editor_remove_upload',
  'file_invalid_signed',
  'file_not_signed',
  'file_signed',
  'key_export_dialog_copy_to_clipboard'
]);

export class FileUploadPanel extends React.Component {
  componentDidUpdate(prevProps) {
    if (this.props.files !== prevProps.files) {
      this.panel.scrollIntoView(false);
    }
  }

  render() {
    return (
      <div className="file-panel d-flex flex-wrap align-items-center" ref={node => this.panel = node}>
        {this.props.files.map(file => <FileUploadElement key={file.id} file={file} onRemove={this.props.onRemoveFile} />)}
      </div>
    );
  }
}

FileUploadPanel.propTypes = {
  files: PropTypes.array,
  onRemoveFile: PropTypes.func
};

function FileUploadElement({file, onRemove}) {
  const fileExt = extractFileExtension(file.name);
  return (
    <div className="file-element" id={file.id} title={file.name}>
      <div className="file-header">
        {(fileExt === 'asc' || fileExt === 'gpg') && <img src="../../img/Mailvelope/logo_signet.svg" width="28" height="28" />}
        {fileExt && <span className="file-extension">{fileExt}</span>}
        <span className="file-name">{extractFileNameWithoutExt(file.name)}</span>
        {onRemove && <span title={l10n.map.editor_remove_upload} className="icon icon-close" onClick={() => onRemove(file.id)}></span>}
      </div>
    </div>
  );
}

FileUploadElement.propTypes = {
  file: PropTypes.object, // {id, name}
  secureIcon: PropTypes.bool,
  onRemove: PropTypes.func
};

export function FileDownloadPanel(props) {
  return (
    <div className={`file-panel ${props.className || 'd-flex flex-wrap align-items-center'}`}>
      {props.files.map(file => <FileDownloadElement key={file.id} file={file} onClick={props.onClickFile} onCopyToClipboard={props.onCopyToClipboard} />)}
    </div>
  );
}

FileDownloadPanel.propTypes = {
  className: PropTypes.string,
  files: PropTypes.array, // {id, name}
  onClickFile: PropTypes.func,
  onCopyToClipboard: PropTypes.func
};

function FileDownloadElement({file, onClick, onCopyToClipboard}) {
  const fileExt = extractFileExtension(file.name);
  const fileName = extractFileNameWithoutExt(file.name);
  return (
    <div className="file-element">
      <a className="file-header" onClick={onClick} title={file.name} download={file.name} href={file.objectURL}>
        {(fileExt === 'asc' || fileExt === 'gpg') && <img src="../../img/Mailvelope/logo_signet.svg" width="28" height="28" />}
        <span className="file-extension">{fileExt}</span>
        <span className="file-name">{fileName}</span>
        <span className="icon icon-download"></span>
        {file.onShowPopup &&
          <button type="button" className="icon-btn ml-1" title={l10n.map.decrypt_open_viewer_btn_title} onClick={e => { e.preventDefault(); file.onShowPopup(); }}><img src="../../img/Mailvelope/logo_signet.svg" width="14" height="14" /></button>
        }
        {file.content &&
          <button type="button" className="icon-btn ml-1" title={l10n.map.key_export_dialog_copy_to_clipboard} onClick={e => { e.preventDefault(); onCopyToClipboard(file.content); }}><span className="icon icon-copy"></span></button>
        }
      </a>
      {file.content &&  <textarea className="form-control" value={file.content} rows={6} spellCheck="false" autoComplete="off" readOnly />}
      {file.signer && <Alert className="mt-2 mb-0 align-self-start" type={file.signer.type}>{file.signer.label}</Alert>}
    </div>
  );
}

FileDownloadElement.propTypes = {
  file: PropTypes.object, // {id, name, objectURL}
  onClick: PropTypes.func,
  onCopyToClipboard: PropTypes.func
};

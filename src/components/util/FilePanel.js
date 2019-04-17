/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';
import {extractFileExtension, getExtensionClass, extractFileNameWithoutExt} from '../../lib/file';

import './FilePanel.css';

l10n.register([
  'editor_remove_upload'
]);

export class FileUploadPanel extends React.Component {
  componentDidUpdate(prevProps) {
    if (this.props.files !== prevProps.files) {
      this.panel.scrollIntoView(false);
    }
  }

  render() {
    return (
      <div className="file-panel" ref={node => this.panel = node}>
        {this.props.files.map(file => <FileUploadElement key={file.id} file={file} onRemove={this.props.onRemoveFile} />)}
      </div>
    );
  }
}

FileUploadPanel.propTypes = {
  files: PropTypes.array,
  onRemoveFile: PropTypes.func
};

function FileUploadElement({file, secureIcon, onRemove}) {
  const fileExt = extractFileExtension(file.name);
  return (
    <div className="file-element" id={file.id} title={file.name}>
      {fileExt && <span className={`file-extension ${getExtensionClass(fileExt)}`}>{fileExt}</span>}
      <span className="file-name">{extractFileNameWithoutExt(file.name)}</span>
      {secureIcon && <span className="icon icon-lock secure-icon"></span>}
      {onRemove && <span title={l10n.map.editor_remove_upload} className="icon icon-close remove-file" onClick={() => onRemove(file.id)}></span>}
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
    <div className="file-panel">
      {props.files.map(file => <FileDownloadElement key={file.id} file={file} onClick={props.onClickFile} />)}
    </div>
  );
}

FileDownloadPanel.propTypes = {
  files: PropTypes.array, // {id, name}
  onClickFile: PropTypes.func
};

function FileDownloadElement({file, onClick}) {
  const fileExt = extractFileExtension(file.name);
  return (
    <a className="file-element" onClick={onClick} title={file.name} download={file.name} href={file.objectURL}>
      <span className={`label file-extension ${getExtensionClass(fileExt)}`}>{fileExt}</span>
      <span className="file-name">{extractFileNameWithoutExt(file.name)}</span>
    </a>
  );
}

FileDownloadElement.propTypes = {
  file: PropTypes.object, // {id, name, objectURL}
  onClick: PropTypes.func
};

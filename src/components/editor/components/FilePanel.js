/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import mvelo from '../../../mvelo';
import * as l10n from '../../../lib/l10n';

l10n.register([
  'editor_remove_upload'
]);

export default class FilePanel extends React.Component {
  componentDidUpdate(prevProps) {
    if (this.props.files !== prevProps.files) {
      this.panel.scrollIntoView(false);
    }
  }

  render() {
    return (
      <div style={{display: 'inline-block'}} ref={node => this.panel = node}>
        {this.props.files.map(file => <FileElement key={file.id} file={file} onRemove={this.props.onRemoveFile} />)}
      </div>
    );
  }
}

FilePanel.propTypes = {
  files: PropTypes.array,
  onRemoveFile: PropTypes.func
};

function FileElement({file, secureIcon, onRemove}) {
  const fileExt = mvelo.util.extractFileExtension(file.name);
  return (
    <div className="attachmentButton" id={file.id} title={file.name}>
      {fileExt && <span className={`attachmentExtension ${mvelo.util.getExtensionClass(fileExt)}`}>{fileExt}</span>}
      <span className="attachmentFilename">{mvelo.util.extractFileNameWithoutExt(file.name)}</span>
      {secureIcon && <span className="glyphicon glyphicon-lock secure-icon"></span>}
      {onRemove && <span title={l10n.map.editor_remove_upload} className="glyphicon glyphicon-remove removeAttachment" onClick={() => onRemove(file.id)}></span>}
    </div>
  );
}

FileElement.propTypes = {
  file: PropTypes.object,
  secureIcon: PropTypes.bool,
  onRemove: PropTypes.func
};

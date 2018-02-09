/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';

import './EditorFooter.css';

l10n.register([
  'upload_attachment',
  'editor_sign_caption_short',
  'editor_sign_caption_long',
  'editor_no_primary_key_caption_short',
  'editor_no_primary_key_caption_long',
  'editor_link_file_encryption'
]);

class EditorFooter extends React.Component {
  constructor(props) {
    super(props);
    this.handleClickUpload = this.handleClickUpload.bind(this);
  }

  componentDidMount() {
    this.initTooltip();
  }

  componentDidUpdate() {
    this.initTooltip();
  }

  initTooltip() {
    if (this.props.signMsg) {
      $(this.signCaption).tooltip();
    }
  }

  handleClickUpload() {
    $('.editor-footer .add-file-input').click();
    this.props.onClickUpload();
  }

  render() {
    const sign_caption_short = this.props.primaryKey ? l10n.map.editor_sign_caption_short : l10n.map.editor_no_primary_key_caption_short;
    const sign_caption_long = this.props.primaryKey ? l10n.map.editor_sign_caption_long : l10n.map.editor_no_primary_key_caption_long;
    return (
      <div className="editor-footer">
        <div className="form-group pull-left">
          <button type="button" onClick={this.handleClickUpload} className={`btn btn-default btn-upload-embedded ${this.props.embedded ? 'show' : 'hide'}`}>
            <span className="glyphicon glyphicon-paperclip"></span>&nbsp;
            <span>{l10n.map.upload_attachment}</span>
          </button>
          <input type="file" className="add-file-input" multiple="multiple" onChange={this.props.onChangeFileInput} />
          <div className={`nav-link-file-encryption ${!this.props.embedded ? 'show' : 'hide'}`}>
            <a role="button" onClick={this.props.onClickFileEncryption}>{l10n.map.editor_link_file_encryption}</a>
          </div>
        </div>
        <div className="pull-right">
          <span ref={node => this.signCaption = node} className={`txt-digital-signature ${this.props.signMsg ? 'show' : 'hide'}`}
            data-toggle="tooltip" data-placement="left" title={sign_caption_long}>
            {sign_caption_short}
          </span>
        </div>
      </div>
    );
  }
}

EditorFooter.propTypes = {
  embedded: PropTypes.bool, // component is used inside API container view
  signMsg: PropTypes.bool, // message will be signed
  primaryKey: PropTypes.bool, // primary key to sign message exists
  onClickUpload: PropTypes.func, // click on upload button
  onChangeFileInput: PropTypes.func, // file input change event triggered
  onClickFileEncryption: PropTypes.func // click on navigation link
};

export default EditorFooter;

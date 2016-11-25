/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import * as l10n from '../../../lib/l10n';

'use strict';

l10n.register([
  'upload_attachment',
  'editor_sign_caption_short',
  'editor_sign_caption_long',
  'editor_no_primary_key_caption_short',
  'editor_no_primary_key_caption_long'
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
    $('#addFileInput').click();
    this.props.onClickUpload();
  }

  render() {
    const sign_caption_short = this.props.primaryKey ? l10n.map.editor_sign_caption_short : l10n.map.editor_no_primary_key_caption_short;
    const sign_caption_long = this.props.primaryKey ? l10n.map.editor_sign_caption_long : l10n.map.editor_no_primary_key_caption_long;
    return (
      <div>
        <div className="form-group pull-left">
          <button onClick={this.handleClickUpload} className={`btn btn-default btn-upload-embedded ${this.props.embedded ? 'show' : 'hide'}`}>
            <span className="glyphicon glyphicon-paperclip"></span>&nbsp;
            <span>{l10n.map.upload_attachment}</span>
          </button>
          <input type="file" id="addFileInput" multiple="multiple" onChange={this.props.onChangeFileInput}/>
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
  embedded: React.PropTypes.bool, // component is used inside API container view
  signMsg: React.PropTypes.bool, // message will be signed
  primaryKey: React.PropTypes.bool, // primary key to sign message exists
  onClickUpload: React.PropTypes.func, // click on upload button
  onChangeFileInput: React.PropTypes.func // file input change event triggered
}

export default EditorFooter;

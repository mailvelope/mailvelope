/**
 * Copyright (C) 2016-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';

l10n.register([
  'upload_attachment',
  'editor_sign_caption_short',
  'editor_sign_caption_long',
  'editor_no_default_key_caption_short',
  'editor_no_default_key_caption_long',
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
      $(this.signCaption).tooltip({container: '.editor'});
    }
  }

  handleClickUpload() {
    $('.editor-footer .add-file-input').click();
    this.props.onClickUpload();
  }

  render() {
    const sign_caption_short = this.props.defaultKey ? l10n.map.editor_sign_caption_short : l10n.map.editor_no_default_key_caption_short;
    const sign_caption_long = this.props.defaultKey ? l10n.map.editor_sign_caption_long : l10n.map.editor_no_default_key_caption_long;
    return (
      <div className="editor-footer w-100 d-flex flex-wrap align-items-center">
        <div>
          <button type="button" onClick={this.handleClickUpload} className={`btn btn-sm btn-secondary ${this.props.embedded ? '' : 'd-none'}`}>
            <i className="icon icon-add" aria-hidden="true"></i>&nbsp;
            <span>{l10n.map.upload_attachment}</span>
          </button>
          <input type="file" className="add-file-input d-none" multiple="multiple" onChange={this.props.onChangeFileInput} />
          <div className={`${!this.props.embedded ? '' : 'd-none'} rounded`} style={{background: 'rgba(255,255,255,.5)', padding: '0.15rem 0.2rem', fontSize: '90%'}}>
            <a role="button" className="text-decoration-none" href="#" onClick={this.props.onClickFileEncryption}>{l10n.map.editor_link_file_encryption}</a>
          </div>
        </div>
        <div className="ml-auto">
          <span ref={node => this.signCaption = node} className={`${this.props.signMsg ? '' : 'd-none'} rounded`}
            data-toggle="tooltip" data-placement="left" title={sign_caption_long} style={{background: 'rgba(255,255,255,.5)', padding: '0.1rem 0.2rem', fontSize: '80%'}}>
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
  defaultKey: PropTypes.bool, // default key to sign message exists
  onClickUpload: PropTypes.func, // click on upload button
  onChangeFileInput: PropTypes.func, // file input change event triggered
  onClickFileEncryption: PropTypes.func // click on navigation link
};

export default EditorFooter;

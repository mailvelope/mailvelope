/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {FileUploadPanel} from './FilePanel';
import * as l10n from '../../lib/l10n';

import './FileUpload.scss';

l10n.register([
  'upload_help',
  'upload_attachment',
  'upload_drop'
]);

export default class FileUpload extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      dragging: false
    };
    this.handleClickUpload = this.handleClickUpload.bind(this);
    this.handleDragEnter = this.handleDragEnter.bind(this);
    this.handleDragLeave = this.handleDragLeave.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
  }

  componentDidMount() {
    this.dragCounter = 0;
  }

  handleClickUpload() {
    this.fileInput.click();
    this.props.onClickUpload();
  }

  handleDragEnter(e) {
    e.preventDefault();
    this.dragCounter++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      this.setState({dragging: true});
    }
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.dragCounter--;
    if (this.dragCounter > 0) {
      return;
    }
    this.setState({dragging: false});
  }

  handleDrop(e) {
    e.preventDefault();
    this.setState({dragging: false});
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      this.props.onChangeFileInput(e.dataTransfer.files);
      e.dataTransfer.clearData();
      this.dragCounter = 0;
    }
  }

  render() {
    return (
      <div
        className="fileUpload w-100"
        onDragEnter={this.handleDragEnter}
        onDragLeave={this.handleDragLeave}
        onDragOver={e => e.preventDefault()}
        onDrop={this.handleDrop}>
        <div className="area d-flex flex-column justify-content-center align-items-center overflow-auto p-3">
          {this.props.files.length > 0 &&
            <div className="align-items-start align-self-stretch mb-2 ">
              <FileUploadPanel files={this.props.files} onRemoveFile={this.props.onRemoveFile} />
            </div>
          }
          <div className="d-flex justify-content-center align-items-center align-self-stretch">
            <span className="text-muted font-italic mr-3">{l10n.map.upload_help}</span>
            <button type="button" onClick={this.handleClickUpload} className="btn btn-sm btn-secondary">
              <span>{l10n.map.upload_attachment}</span>
            </button>
            <input ref={node => this.fileInput = node} type="file" className="add-file-input d-none" multiple="multiple" onChange={e => this.props.onChangeFileInput(e.target.files)} />
          </div>
        </div>
        <div className={`overlay d-flex justify-content-center align-items-center ${this.state.dragging ? 'active' : ''}`}>
          <span className="text-muted font-italic">{l10n.map.upload_drop}</span>
        </div>
      </div>
    );
  }
}

FileUpload.propTypes = {
  files: PropTypes.array, // {id, name}
  onRemoveFile: PropTypes.func,
  onClickUpload: PropTypes.func,
  onChangeFileInput: PropTypes.func
};

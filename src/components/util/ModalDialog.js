/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../lib/l10n';
import React from 'react';
import PropTypes from 'prop-types';

'use strict';

l10n.register([
  'form_ok',
  'form_cancel'
]);

class ModalDialog extends React.Component {
  componentDidMount() {
    $(this.modalNode).modal({backdrop: 'static'});
    $(this.modalNode).modal('show');
    $(this.modalNode).on('hidden.bs.modal', this.props.onHide);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.hide !== nextProps.hide && nextProps.hide) {
      $(this.modalNode).modal('hide');
    }
  }

  render() {
    return (
      <div className="modal fade" tabIndex="-1" role="dialog" ref={node => this.modalNode = node}>
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <button type="button" onClick={this.props.onCancel} className="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
              <h4 className="modal-title">{this.props.title}</h4>
            </div>
            <div className="modal-body">
              {this.props.children}
            </div>
            <div className="modal-footer">
              {this.props.footer ||
                <div>
                  <button type="button" onClick={this.props.onCancel} className="btn btn-default" data-dismiss="modal">{l10n.map.form_cancel}</button>
                  <button type="button" onClick={this.props.onOk} className="btn btn-primary" data-dismiss="modal">{l10n.map.form_ok}</button>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

ModalDialog.propTypes = {
  title: PropTypes.string,
  footer: PropTypes.element,
  children: PropTypes.element,
  onHide: PropTypes.func,
  onOk: PropTypes.func,
  onCancel: PropTypes.func,
  hide: PropTypes.bool
};

export default ModalDialog;

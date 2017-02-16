/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import React from 'react';

'use strict';

l10n.register([
  'dialog_popup_close'
]);

class ModalDialog extends React.Component {
  componentDidMount() {
    $(this.modalNode).modal({backdrop: 'static'});
    $(this.modalNode).modal('show');
    $(this.modalNode).on('hidden.bs.modal', this.props.onHide);
  }

  render() {
    return (
      <div className="modal fade" tabIndex="-1" role="dialog" ref={node => this.modalNode = node}>
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <button type="button" className="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
              <h4 className="modal-title">{this.props.title}</h4>
            </div>
            <div className="modal-body">
              {this.props.children}
            </div>
            <div className="modal-footer">
              {this.props.footer}
              <button type="button" className="btn btn-primary" data-dismiss="modal">
                <span className="glyphicon glyphicon-remove" aria-hidden="true"></span>&nbsp;{l10n.map.dialog_popup_close}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

ModalDialog.propTypes = {
  title: React.PropTypes.string,
  footer: React.PropTypes.element,
  children: React.PropTypes.element,
  onHide: React.PropTypes.func
}

export default ModalDialog;

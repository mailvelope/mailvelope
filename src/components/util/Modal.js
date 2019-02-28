/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../lib/l10n';
import React from 'react';
import PropTypes from 'prop-types';

l10n.register([
  'form_ok',
  'form_cancel'
]);

class Modal extends React.Component {
  componentDidMount() {
    this.$node.modal({backdrop: 'static', keyboard: this.props.keyboard});
    this.$node.modal('show');
    this.$node.on('hidden.bs.modal', this.props.onHide);
    this.$node.on('show.bs.modal', this.props.onShow);
  }

  componentWillUnmount() {
    this.$node.modal('hide');
  }

  render() {
    return (
      <div className={`modal fade ${this.props.className || ''}`} tabIndex="-1" role="dialog" ref={node => this.$node = $(node)}>
        <div className={`modal-dialog ${this.props.size === 'small' ? 'modal-sm' : this.props.size === 'large' ? 'modal-lg' : ''}`} role="document">
          <div className="modal-content">
            <div className={`modal-header ${this.props.hideHeader ? 'hide' : ''} ${this.props.headerClass}`}>
              {this.props.header ||
                <>
                  <h5 className="modal-title">{this.props.title}</h5>
                  <button type="button" onClick={this.props.onCancel} className="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </>
              }
            </div>
            <div className="modal-body">
              {this.props.children}
            </div>
            <div className={`modal-footer ${this.props.hideFooter ? 'd-none' : ''}`}>
              {this.props.footer ||
                <div>
                  <button type="button" onClick={this.props.onCancel} className="btn btn-secondary" data-dismiss="modal">{l10n.map.form_cancel}</button>
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

Modal.propTypes = {
  className: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  title: PropTypes.string,
  header: PropTypes.element,
  headerClass: PropTypes.string,
  footer: PropTypes.element,
  children: PropTypes.element,
  onHide: PropTypes.func,
  onShow: PropTypes.func,
  onOk: PropTypes.func,
  onCancel: PropTypes.func,
  hideHeader: PropTypes.bool,
  hideFooter: PropTypes.bool,
  keyboard: PropTypes.bool
};

Modal.defaultProps = {
  size: 'medium',
  keyboard: true,
  headerClass: ''
};

export default Modal;

/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import {KeyringOptions} from './../KeyringOptions';
import {formatFpr} from '../../../lib/util';
import * as l10n from '../../../lib/l10n';
import DatePicker from './DatePicker';
import DefinePassword from '../../../components/util/DefinePassword';
import KeySelect from './KeySelect';
import KeyStatus from './KeyStatus';
import Modal from '../../../components/util/Modal';
import Alert from '../../../components/util/Alert';

l10n.register([
  'change_link',
  'dialog_cancel_btn',
  'dialog_save_btn',
  'keydetails_change_exp_date_dialog_note',
  'keydetails_change_exp_date_dialog_title',
  'keydetails_change_pwd_dialog_old',
  'keydetails_change_pwd_dialog_title',
  'keydetails_creation_date',
  'keydetails_expiration_date',
  'keydetails_key_not_expire',
  'keydetails_password',
  'keydetails_title',
  'keygrid_algorithm',
  'keygrid_key_fingerprint',
  'keygrid_key_length',
  'keygrid_key_not_expire',
  'keygrid_keyid',
  'keygrid_validity_status',
  'pwd_dialog_wrong_pwd',
]);

// set locale
moment.locale(navigator.language);

export default class KeyDetails extends React.Component {
  constructor(props) {
    super(props);
    const keys = this.getAllKeys(props.keyDetails);
    const defaultKeyIdx = 0;
    const normalizedExDate = this.normalizeDate(keys[defaultKeyIdx].exDate);
    this.state = {
      showExDateModal: false,
      showPwdModal: false,
      action: '',
      keys,
      selectedKeyIdx: defaultKeyIdx,
      exDateInput: normalizedExDate,
      keyExpirationTime: normalizedExDate,
      passwordCurrent: '',
      password: '',
      errors: {}
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleChangeKey = this.handleChangeKey.bind(this);
    this.handleChangeExDate = this.handleChangeExDate.bind(this);
    this.handleChangePwd = this.handleChangePwd.bind(this);
    this.validateChangePwd = this.validateChangePwd.bind(this);
    this.cleanUpPwdData = this.cleanUpPwdData.bind(this);
    this.handleHiddenModal = this.handleHiddenModal.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props.keyDetails !== prevProps.keyDetails) {
      this.setState({keys: this.getAllKeys(this.props.keyDetails)});
    }
  }

  normalizeDate(date) {
    return date !== false ? moment(date) : null;
  }

  getAllKeys({status, algorithm, bitLength, crDate, exDate, fingerprint, keyId, subkeys}) {
    return [
      {status, crDate, exDate, keyId, algorithm, bitLength, fingerprint},
      ...subkeys
    ];
  }

  handleChange(event) {
    const target = event.target;
    this.setState(({errors: err}) => {
      const {[target.id]: deleted, ...errors} = err;
      if (target.error) {
        errors[target.id] = new Error();
      }
      return {[target.id]: target.value, errors};
    });
  }

  handleChangeKey(selectedKeyIdx) {
    this.setState(prevState => {
      const normalizedExDate = this.normalizeDate(prevState.keys[selectedKeyIdx].exDate);
      return {
        selectedKeyIdx,
        exDateInput: normalizedExDate,
        keyExpirationTime: normalizedExDate
      };
    });
  }

  async handleChangeExDate() {
    const isoTimeString = this.state.keyExpirationTime !== null ? this.state.keyExpirationTime.toISOString() : false;
    if (this.state.keys[this.state.selectedKeyIdx].exDate !== isoTimeString) {
      try {
        await this.props.onChangeExpDate(isoTimeString);
        this.setState(prevSate => ({
          exDateInput: prevSate.keyExpirationTime
        }));
      } catch (error) {
        if (error.code !== 'PWD_DIALOG_CANCEL') {
          throw error;
        }
      } finally {
        this.setState(prevSate => ({
          keyExpirationTime: prevSate.exDateInput
        }));
      }
    }
  }

  async validateChangePwd() {
    const errors = {...this.state.errors};
    const pwdIsValid = await this.props.onValidateKeyPwd(this.state.passwordCurrent);
    if (!pwdIsValid) {
      errors.passwordCurrent = new Error();
    }
    if (!this.state.password.length) {
      errors.password = new Error();
    }
    if (Object.keys(errors).length) {
      this.setState({errors});
      return;
    }
    this.setState({action: 'setPwd', showPwdModal: false});
  }

  async handleChangePwd() {
    try {
      await this.props.onChangePwd(this.state.passwordCurrent, this.state.password);
    } catch (error) {
      if (error.code !== 'PWD_DIALOG_CANCEL') {
        throw error;
      }
    }
  }

  cleanUpPwdData() {
    this.setState({
      showPwdModal: false,
      password: '',
      passwordCurrent: '',
      errors: {}
    });
  }

  async handleHiddenModal() {
    switch (this.state.action) {
      case 'setExDate':
        await this.handleChangeExDate();
        break;
      case 'setPwd':
        await this.handleChangePwd();
    }
    this.cleanUpPwdData();
  }

  render() {
    const selectedKey = this.state.keys[this.state.selectedKeyIdx];
    return (
      <div className="keyDetails">
        <div className="card card-clean">
          <div className="card-header d-flex align-items-center justify-content-between flex-wrap">
            <h3>{l10n.map.keydetails_title}</h3>
            <KeySelect keys={this.state.keys} selectedKeyIdx={this.state.selectedKeyIdx} onChange={index => this.handleChangeKey(index)} />
          </div>
          <div className="card-body pb-0">
            <div className="row">
              <div className="col-lg-5">
                <dl className="row d-flex align-items-center mb-0">
                  <dt className="col-md-4 col-xl-3 mb-2 text-nowrap">{l10n.map.keygrid_validity_status}</dt>
                  <dd className="col-md-8 col-xl-9"><KeyStatus status={selectedKey.status} /></dd>
                  <dt className="col-4 col-xl-3 mb-2 text-nowrap">{l10n.map.keydetails_creation_date}</dt>
                  <dd className="col-md-8 col-xl-9">{moment(selectedKey.crDate).format('L')}</dd>
                  <dt className="col-4 col-xl-3 mb-2 text-nowrap">{l10n.map.keydetails_expiration_date}</dt>
                  <dd className="col-md-8 col-xl-9">
                    {!this.context.gnupg && this.props.keyDetails.type !== 'public' && this.state.selectedKeyIdx === 0 ? (
                      <div className="input-group input-group-sm" style={{width: '155px'}}>
                        <input type="text" readOnly className="form-control" value={this.state.exDateInput !== null ? this.state.exDateInput.format('L') : 'nie'} />
                        <div className="input-group-append">
                          <button onClick={() => this.setState({showExDateModal: true})} className="btn btn-secondary" type="button" disabled={!this.props.keyDetails.validity}>{l10n.map.change_link}</button>
                        </div>
                      </div>
                    ) : (
                      <div>{selectedKey.exDate ? moment(selectedKey.exDate).format('L') : l10n.map.keydetails_key_not_expire}</div>
                    )}
                  </dd>
                  {this.props.keyDetails.type !== 'public' &&
                    <>
                      <dt className="col-md-4 col-xl-3 mb-2 text-nowrap">{l10n.map.keydetails_password}</dt>
                      <dd className="col-md-8 col-xl-9">
                        {!this.context.gnupg && this.state.selectedKeyIdx === 0 ? (
                          <div className="input-group input-group-sm" style={{width: '155px'}}>
                            <input type="password" readOnly className="form-control text-monospace" value="********" />
                            <span className="input-group-append">
                              <button onClick={() => this.setState({showPwdModal: true})} className="btn btn-secondary" type="button" disabled={!this.props.keyDetails.validity}>{l10n.map.change_link}</button>
                            </span>
                          </div>
                        ) : (
                          <div>********</div>
                        )}
                      </dd>
                    </>
                  }
                </dl>
              </div>
              <div className="col-lg-7">
                <dl className="row d-flex align-items-center mb-0">
                  <dt className="col-md-4 col-xl-3 mb-2 text-nowrap">{l10n.map.keygrid_keyid}</dt>
                  <dd className="col-md-8 col-xl-9">{selectedKey.keyId}</dd>
                  <dt className="col-md-4 col-xl-3 mb-2 text-nowrap">{l10n.map.keygrid_algorithm}</dt>
                  <dd className="col-md-8 col-xl-9">{selectedKey.algorithm}</dd>
                  <dt className="col-md-4 col-xl-3 mb-2 text-nowrap">{l10n.map.keygrid_key_length}</dt>
                  <dd className="col-md-8 col-xl-9">{selectedKey.bitLength}</dd>
                  <dt className="col-md-4 col-xl-3 mb-2 text-nowrap">{l10n.map.keygrid_key_fingerprint}</dt>
                  <dd className="col-md-8 col-xl-9">{formatFpr(selectedKey.fingerprint)}</dd>
                </dl>
              </div>

            </div>
          </div>
        </div>
        <Modal isOpen={this.state.showExDateModal} toggle={() => this.setState(prevState => ({showExDateModal: !prevState.showExDateModal}))} size="medium" title={l10n.map.keydetails_change_exp_date_dialog_title} hideFooter={true} onHide={this.handleHiddenModal}>
          <>
            <div className="form-group">
              <DatePicker value={this.state.keyExpirationTime} onChange={moment => this.handleChange({target: {id: 'keyExpirationTime', value: moment}})} placeholder={l10n.map.keygrid_key_not_expire} minDate={moment().add({days: 1})} maxDate={moment('2080-12-31')} disabled={false} />
            </div>
            <Alert type="warning" header={l10n.map.header_warning}>
              {l10n.map.keydetails_change_exp_date_dialog_note}
            </Alert>
            <div className="row btn-bar">
              <div className="col-6">
                <button type="button" className="btn btn-secondary btn-block" onClick={() => this.setState({showExDateModal: false})}>{l10n.map.dialog_cancel_btn}</button>
              </div>
              <div className="col-6">
                <button type="button" onClick={() => this.setState({action: 'setExDate', showExDateModal: false})} className="btn btn-primary btn-block">{l10n.map.dialog_save_btn}</button>
              </div>
            </div>
          </>
        </Modal>
        <Modal isOpen={this.state.showPwdModal} toggle={() => this.setState(prevState => ({showPwdModal: !prevState.showPwdModal}))} size="small" title={l10n.map.keydetails_change_pwd_dialog_title} hideFooter={true} onHide={this.handleHiddenModal}>
          <form>
            <div className="form-group">
              <label htmlFor="passwordCurrent">{l10n.map.keydetails_change_pwd_dialog_old}</label>
              <input type="password" onChange={this.handleChange} className={`form-control ${this.state.errors.passwordCurrent ? 'is-invalid' : ''} text-monospace`} id="passwordCurrent" />
              {this.state.errors.passwordCurrent && <div className="invalid-feedback">{l10n.map.pwd_dialog_wrong_pwd}</div>}
            </div>
            <DefinePassword value={this.state.password} errors={this.state.errors} onChange={this.handleChange} disabled={this.state.success} />
            <div className="row btn-bar">
              <div className="col-6">
                <button type="button" className="btn btn-secondary" onClick={() => this.setState({showPwdModal: false})}>{l10n.map.dialog_cancel_btn}</button>
              </div>
              <div className="col-6">
                <button type="button" onClick={this.validateChangePwd} className="btn btn-primary">{l10n.map.dialog_save_btn}</button>
              </div>
            </div>
          </form>
        </Modal>
      </div>
    );
  }
}

KeyDetails.contextType = KeyringOptions;

KeyDetails.propTypes = {
  keyDetails: PropTypes.object.isRequired,
  onChangeExpDate: PropTypes.func,
  onValidateKeyPwd: PropTypes.func,
  onChangePwd: PropTypes.func
};

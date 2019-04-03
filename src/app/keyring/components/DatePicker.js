/**
 * Copyright (C) 2016-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import ReactDatePicker from 'react-datepicker';

import 'react-datepicker/dist/react-datepicker.css';
import './DatePicker.scss';

class CustomInput extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className="input-group">
        <input type="text" className="form-control border-right-0" value={this.props.value} placeholder={this.props.placeholder} disabled={this.props.disabled} readOnly />
        <span className="input-group-append">
          <span className={`input-group-text border-left-0 bg-white ${this.props.value ? '' : 'd-none'}`}>
            <i className="form-control-clear icon icon-close" onClick={this.props.onClearDate} aria-hidden="true"></i>
          </span>
          <button type="button" className="btn btn-secondary" onClick={this.props.onClick} disabled={this.props.disabled}>
            <span className="icon icon-calender"></span>
          </button>
        </span>
      </div>
    );
  }
}

CustomInput.propTypes = {
  value: PropTypes.string,
  onClick: PropTypes.func,
  onClearDate: PropTypes.func,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool
};

export default function DatePicker({value, onChange, placeholder, minDate, maxDate, disabled}) {
  // ReactDatePicker maps placeholderText to placeholder prop of customInput
  return (
    <ReactDatePicker
      customInput={<CustomInput onClearDate={() => onChange(null)} />}
      selected={value}
      showMonthDropdown
      showYearDropdown
      forceShowMonthNavigation={false}
      minDate={minDate}
      maxDate={maxDate}
      dropdownMode="select"
      onChange={onChange}
      placeholderText={placeholder}
      disabled={disabled} />
  );
}

DatePicker.propTypes = {
  value: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  minDate: PropTypes.object,
  maxDate: PropTypes.object,
  disabled: PropTypes.bool
};

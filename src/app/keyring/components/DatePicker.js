/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import ReactDatePicker from 'react-datepicker';

import 'react-datepicker/dist/react-datepicker.css'
import './DatePicker.css';

'use strict';

class CustomInput extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const clearClasses = `form-control-clear glyphicon glyphicon-remove form-control-feedback ${this.props.value ? '' : 'hidden'}`;
    return (
      <div className="input-group">
        <div className="has-feedback">
          <input type="text" className="form-control" value={this.props.value} placeholder={this.props.placeholder} disabled={this.props.disabled} />
          <span className={clearClasses} onClick={this.props.onClearDate} aria-hidden="true"></span>
        </div>
        <span className="input-group-btn">
          <button type="button" className="btn btn-default" onClick={this.props.onClick} disabled={this.props.disabled}>
            <i className="glyphicon glyphicon-calendar"></i>
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
}

const DatePicker = ({value, onChange, placeholder, minDate, maxDate, disabled}) => {
  // ReactDatePicker maps placeholderText to placeholder prop of customInput
  return (
    <ReactDatePicker
      customInput={<CustomInput onClearDate={() => onChange(null)}/>}
      selected={value}
      showMonthDropdown
      showYearDropdown
      minDate={minDate}
      maxDate={maxDate}
      dropdownMode="select"
      onChange={onChange}
      placeholderText={placeholder}
      disabled={disabled} />
  );
};

DatePicker.propTypes = {
  value: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  minDate: PropTypes.object,
  maxDate: PropTypes.object,
  disabled: PropTypes.bool
}

export default DatePicker;

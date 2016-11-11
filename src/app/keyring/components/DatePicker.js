/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
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
  value: React.PropTypes.string,
  onClick: React.PropTypes.func,
  onClearDate: React.PropTypes.func,
  placeholder: React.PropTypes.string,
  disabled: React.PropTypes.bool
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
  value: React.PropTypes.object,
  onChange: React.PropTypes.func.isRequired,
  placeholder: React.PropTypes.string,
  minDate: React.PropTypes.object,
  maxDate: React.PropTypes.object,
  disabled: React.PropTypes.bool
}

export default DatePicker;

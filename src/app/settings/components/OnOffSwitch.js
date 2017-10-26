
import React from 'react';
import PropTypes from 'prop-types';

import './OnOffSwitch.css';

export default function OnOffSwitch({checked, id, onChange}) {
  return (
    <div className="onoffswitch">
      <input checked={checked} onChange={onChange} type="checkbox" name="onoffswitch" className="onoffswitch-checkbox" id={id} />
      <label className="onoffswitch-label" htmlFor={id} >
        <span className="onoffswitch-inner"></span>
        <span className="onoffswitch-switch"></span>
      </label>
    </div>
  );
}

OnOffSwitch.propTypes = {
  checked: PropTypes.bool,
  id: PropTypes.string.isRequired,
  onChange: PropTypes.func
};

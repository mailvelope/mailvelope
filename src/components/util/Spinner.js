
'use strict';

import React from 'react';

import './Spinner.css';

function Spinner() {
  return (
    <div className="m-spinner" style={{margin: '60px auto 60px'}}>
      <div className="bounce1"></div><div className="bounce2"></div><div className="bounce3"></div>
    </div>
  );
}

export default Spinner;

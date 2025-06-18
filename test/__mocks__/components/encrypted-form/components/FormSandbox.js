/**
 * Mock for FormSandbox component used in tests
 * Avoids iframe creation and provides simplified functionality
 */
import React from 'react';
import PropTypes from 'prop-types';

function MockFormSandbox({onLoad}) {
  React.useEffect(() => {
    // Simulate form loading
    const timeoutId = setTimeout(() => {
      if (onLoad) {
        onLoad();
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [onLoad]);

  return (
    <div data-testid="form-sandbox">
      Mocked Form Sandbox
    </div>
  );
}

MockFormSandbox.propTypes = {
  onLoad: PropTypes.func
};

export default MockFormSandbox;

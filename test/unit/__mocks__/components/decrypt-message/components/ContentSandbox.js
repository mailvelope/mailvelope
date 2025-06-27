/**
 * Mock for ContentSandbox component used in tests
 * Avoids iframe creation and provides simplified functionality
 */
import React from 'react';
import PropTypes from 'prop-types';

function MockContentSandbox(props) {
  const componentRef = React.useRef();

  React.useEffect(() => {
    // Attach sandbox to the DOM element if needed
    if (componentRef.current) {
      componentRef.current.sandbox = {
        contentDocument: {
          querySelector: () => ({
            replaceChildren: jest.fn()
          })
        }
      };
    }
  }, []);

  return (
    <div ref={componentRef} data-testid="content-sandbox">
      <div data-testid="content-sandbox-content">
        {props.value || 'Mocked ContentSandbox'}
      </div>
    </div>
  );
}

MockContentSandbox.propTypes = {
  value: PropTypes.string
};

export default MockContentSandbox;

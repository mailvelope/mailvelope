/**
 * Mock for PlainText component used in tests
 * Avoids iframe creation and provides simplified functionality
 */
import React from 'react';
import PropTypes from 'prop-types';

function MockPlainText({defaultValue, onChange, onLoad}) {
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    // Simulate plaintext component loading
    const timeoutId = setTimeout(() => {
      if (mountedRef.current && onLoad) {
        onLoad();
      }
    }, 0);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [onLoad]);

  return (
    <div data-testid="plain-text-mock">
      <textarea
        data-testid="plain-text-textarea"
        defaultValue={defaultValue}
        onChange={e => onChange && onChange(e.target.value)}
      />
    </div>
  );
}

MockPlainText.propTypes = {
  defaultValue: PropTypes.string,
  onChange: PropTypes.func,
  onLoad: PropTypes.func
};

export default MockPlainText;


import React from 'react';
import PropTypes from 'prop-types';

export default function Trans(props) {
  return (
    <span>
      {
        props.id.split(/(<\d>.*?<\/\d>)/)
        .map(value => {
          const tags = value.match(/(<(\d)>(.*?)<\/\d>)/);
          if (tags) {
            const comp = props.components[tags[2]];
            return React.cloneElement(comp, null, comp.props.children || tags[3]);
          } else {
            return value;
          }
        })
      }
    </span>
  );
}

Trans.propTypes = {
  id: PropTypes.string,
  components: PropTypes.array
};


import mvelo from '../mvelo';
import React from 'react';

let map = {};

function register(ids) {
  ids.forEach(id => {
    map[id] = true;
  });
}

function mapToLocal() {
  map = mvelo.l10n.getMessages(Object.keys(map));
}

function Trans(props) {
  return <span>{
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
  }</span>;
}

export {map, register, mapToLocal, Trans as default};

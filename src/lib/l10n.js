
import mvelo from '../mvelo';

let map = {};

function register(ids) {
  ids.forEach(id => {
    map[id] = true;
  });
}

function mapToLocal() {
  return new Promise(resolve => {
    mvelo.l10n.getMessages(Object.keys(map), localized => {
      map = localized;
      resolve();
    });
  });
}

export {map, register, mapToLocal};

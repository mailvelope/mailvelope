
import mvelo from '../mvelo';

var map = {};

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

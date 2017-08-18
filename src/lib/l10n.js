
import mvelo from '../mvelo';

let map = {};

function register(ids) {
  ids.forEach(id => {
    map[id] = true;
  });
}

function mapToLocal() {
  map = mvelo.l10n.getMessages(Object.keys(map));
}

export {map, register, mapToLocal};

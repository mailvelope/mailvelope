import Autocrypt from 'autocrypt';

const storage = {};
storage.put = function(key, val, cb) {
  storage[key] = val;
  if (cb) {
    cb();
  }
};
storage.get = function(key, cb) {
  if (cb) {
    cb(undefined, storage[key]);
  }
};
const autocrypt = new Autocrypt({storage});

export function lookup(email) {
  return new Promise((resolve, reject) => {
    autocrypt.storage.get(email, (err, record) => {
      if (err) {
        reject(err);
      } else {
        resolve(record.keydata);
      }
    });
  });
}

export async function processHeader(header, fromAddr, date) {
  return new Promise((resolve, reject) => {
    autocrypt.processAutocryptHeader(header, fromAddr, date, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

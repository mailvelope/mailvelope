import testKeys from 'Fixtures/keys';
import * as autocrypt from 'modules/autocryptWrapper';

const addr = 'test@mailvelope.com';
const keydata = testKeys.api_test_pub.split('\n').slice(2, 17).join('');
export const testAutocryptHeaders = {
  from: addr,
  autocrypt: autocrypt.stringify({keydata, addr}),
  date: Date.now().toString()
};

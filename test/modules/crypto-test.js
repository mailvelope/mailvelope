import {expect} from 'test';
import {randomString, symEncrypt, getSecureRandom} from 'modules/crypto';
import * as openpgp from 'openpgp';

describe('Crypto unit test', () => {
  describe('randomString', () => {
    it('should generate random string with given length', () => {
      const length = 8;
      const results = [];
      for (let i = 0; i < 25; i++) {
        results.push(randomString(length));
      }
      expect(results.every(value => typeof value === 'string')).to.be.true;
      expect(results.every(value => value.length === length)).to.be.true;
      expect(results.filter((item, index) => results.indexOf(item) != index).length).to.equal(0);
    });
  });

  describe('symEncrypt', () => {
    it('should encrypt the message symmetrically using given passphrase', () => {
      const msgText = 'This is a test message!';
      const msg = openpgp.message.fromText(msgText);
      const passphrase = 'p0kjb42gm1o76g5t2kdm3mejlo';
      return symEncrypt(msg, passphrase).then(async message => {
        message = await message.decrypt(null, [passphrase]);
        const messageText = await openpgp.stream.readToEnd(message.getText());
        expect(messageText).to.equal(msgText);
      });
    });
  });

  describe('getSecureRandom', () => {
    it('should return a secure random number in the specified range', () => {
      const min = 320;
      const max = 100000;
      const results = [];
      for (let i = 0; i < 25; i++) {
        results.push(getSecureRandom(min, max));
      }
      expect(results.every(value => typeof value === 'number')).to.be.true;
      expect(results.every(value => (value >= min && value <= max))).to.be.true;
      expect(results.filter((item, index) => results.indexOf(item) != index).length).to.equal(0);
    });
  });
});

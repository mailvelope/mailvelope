import {expect} from 'test';
import {Port} from 'utils';
import * as sub from 'controller/sub.controller';

describe('Sub controller unit tests', () => {
  let ctrl;
  let port1;
  let port2;

  beforeEach(() => {
    port1 = Port.connect({name: 'foo-1'});
    port2 = port1._otherPort;
    ctrl = new sub.SubController(port1);
  });

  describe('Event handling via "on" and "emit"', () => {
    it('should receive events', done => {
      ctrl.on('ping', msg => {
        expect(msg.data).to.equal('pong');
        done();
      });
      port2.postMessage({event: 'ping', data: 'pong'});
    });
    it('should emit events', done => {
      port2.onMessage.addListener(msg => {
        expect(msg.data).to.equal('pong');
        done();
      });

      ctrl.emit('ping', {data: 'pong'});
    });
  });
});

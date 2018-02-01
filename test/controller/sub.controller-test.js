
import * as sub from '../../src/controller/sub.controller';
import {Port} from '../util';

describe('Sub controller unit tests', () => {
  let ctrl;
  let port;

  beforeEach(() => {
    port = new Port('foo-1');
    sinon.spy(port, 'postMessage');
    ctrl = new sub.SubController(port);
  });

  describe('Event handling via "on" and "emit"', () => {
    it('should be wired up correctly', done => {
      ctrl.on('ping', msg => {
        expect(msg.data).to.equal('pong');
        done();
      });

      ctrl.emit('ping', {data: 'pong', to: 'foo-1'});
    });
  });
});

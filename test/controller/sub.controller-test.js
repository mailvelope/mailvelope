import {expect, sinon} from 'test';
import {Port} from 'utils';
import * as sub from 'controller/sub.controller';

describe('Sub controller unit tests', () => {
  const sandbox = sinon.createSandbox();
  let ctrl;
  let port;

  beforeEach(() => {
    port = new Port('foo-1');
    sandbox.spy(port, 'postMessage');
    ctrl = new sub.SubController(port);
  });

  afterEach(() => {
    sandbox.restore();
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

  describe('Parse view name', () => {
    it('Split at -', () => {
      const {type, id} = sub.parseViewName('app-123');
      expect(type).to.equal('app');
      expect(id).to.equal('123');
    });

    it('Separator - required', () => {
      expect(sub.parseViewName.bind(null, 'app')).to.throw('Invalid view name.');
    });

    it('Only one - separator allowed', () => {
      expect(sub.parseViewName.bind(null, 'app-1-2')).to.throw('Invalid view name.');
    });
  });
});

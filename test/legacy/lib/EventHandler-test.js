import {expect, sinon} from 'test';
import EventHandler from 'lib/EventHandler';
import {Port} from 'utils';

describe('EventHandler unit tests', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe('Port message event handling', () => {
    let ctrl1;
    let ctrl2;

    beforeEach(() => {
      const port1 = Port.connect({name: 'foo-1'});
      const port2 = port1._otherPort;
      ctrl1 = new EventHandler(port1);
      sandbox.spy(ctrl1._port, 'postMessage');
      ctrl2 = new EventHandler(port2);
      sandbox.spy(ctrl2._port, 'postMessage');
    });

    describe('Event handling via "on" and "emit"', () => {
      it('should work with main port', done => {
        ctrl2.on('blub', msg => {
          expect(ctrl2._handlers).to.exist;
          expect(msg.data).to.equal('hello');
          expect(msg.event).to.equal('blub');
          expect(ctrl1._port.postMessage.withArgs({event: 'blub', data: 'hello'}).calledOnce).to.be.true;
          expect(ctrl2._port.postMessage.called).to.be.false;
          done();
        });

        ctrl1.emit('blub', {data: 'hello'});
      });

      it('should work with second port', done => {
        ctrl1.on('blub', () => {
          expect(ctrl1._port.postMessage.called).to.be.false;
          expect(ctrl2._port.postMessage.withArgs({event: 'blub', data: 'hello'}).calledOnce).to.be.true;
          done();
        });

        ctrl2.emit('blub', {data: 'hello'});
      });

      it('should log for unknown event', done => {
        sandbox.stub(console, 'log');

        ctrl1.emit('unknown');

        setTimeout(() => {
          expect(console.log.calledOnce).to.be.true;
          expect(ctrl1._port.postMessage.calledOnce).to.be.true;
          expect(ctrl2._port.postMessage.called).to.be.false;
          done();
        }, 10);
      });

      it('should throw for invalid input', () => {
        expect(ctrl1.on.bind({})).to.throw(/Invalid/);
        expect(ctrl2.emit.bind({})).to.throw(/Invalid/);
      });
    });
  });
});

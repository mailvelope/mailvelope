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
      ctrl1 = new EventHandler(new Port('ctrl1'));
      sandbox.spy(ctrl1._port, 'postMessage');
      ctrl2 = new EventHandler(new Port('ctrl2'));
      sandbox.spy(ctrl2._port, 'postMessage');
    });

    describe('Event handling via "on" and "emit"', () => {
      it('should work with main port', done => {
        ctrl2.on('blub', msg => {
          expect(ctrl2._handlers).to.exist;
          expect(msg.data).to.equal('hello');
          expect(msg.event).to.equal('blub');
          expect(ctrl1._port.postMessage.withArgs({event: 'blub', to: 'ctrl2', data: 'hello'}).calledOnce).to.be.true;
          expect(ctrl2._port.postMessage.called).to.be.false;
          done();
        });

        ctrl1.emit('blub', {data: 'hello', to: 'ctrl2'});
      });

      it('should work with second port', done => {
        ctrl1.on('blub', () => {
          expect(ctrl1._port.postMessage.called).to.be.false;
          expect(ctrl2._port.postMessage.withArgs({event: 'blub', to: 'ctrl1', data: 'hello'}).calledOnce).to.be.true;
          done();
        });

        ctrl2.emit('blub', {data: 'hello', to: 'ctrl1'});
      });

      it('should log for unknown event', () => {
        sandbox.stub(console, 'log');

        ctrl1.emit('unknown', {to: 'ctrl2'});

        expect(console.log.calledOnce).to.be.true;
        expect(ctrl1._port.postMessage.calledOnce).to.be.true;
        expect(ctrl2._port.postMessage.called).to.be.false;
      });

      it('should throw for invalid input', () => {
        expect(ctrl1.on.bind({})).to.throw(/Invalid/);
        expect(ctrl2.emit.bind({})).to.throw(/Invalid/);
      });
    });
  });
});

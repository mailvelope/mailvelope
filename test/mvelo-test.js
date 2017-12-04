
import mvelo from '../src/mvelo';
import {Port} from './util';

describe('mvelo unit tests', () => {
  describe('deDup', () => {
    it('should work for undefined', () => {
      expect(mvelo.util.deDup()).to.deep.equal([]);
    });
    it('should work for empty array', () => {
      expect(mvelo.util.deDup([])).to.deep.equal([]);
    });
    it('should work for unsorted array', () => {
      expect(mvelo.util.deDup(['c', 'b', 'a', 'b'])).to.deep.equal(['c', 'b', 'a']);
    });
  });

  describe('checkEmail', () => {
    it('should be false for undefined', () => {
      expect(mvelo.util.checkEmail()).to.be.false;
    });
    it('should be false empty string', () => {
      expect(mvelo.util.checkEmail('')).to.be.false;
    });
    it('should be false special char at the beginning', () => {
      expect(mvelo.util.checkEmail('>foo@bar.co')).to.be.false;
    });
    it('should be false special char at the end', () => {
      expect(mvelo.util.checkEmail('foo@bar.co>')).to.be.false;
    });
    it('should be false no @', () => {
      expect(mvelo.util.checkEmail('foobar.co')).to.be.false;
    });
    it('should be false no .', () => {
      expect(mvelo.util.checkEmail('foo@barco')).to.be.false;
    });
    it('should be true fo valid email address', () => {
      expect(mvelo.util.checkEmail('foo@bar.co')).to.be.true;
    });
  });

  describe('Port message event handling', () => {
    let ctrl1;
    let ctrl2;

    beforeEach(() => {
      ctrl1 = new mvelo.EventHandler(new Port('ctrl1'));
      sinon.spy(ctrl1._port, 'postMessage');
      ctrl2 = new mvelo.EventHandler(new Port('ctrl2'));
      sinon.spy(ctrl2._port, 'postMessage');
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
        sinon.stub(console, 'log');

        ctrl1.emit('unknown', {to: 'ctrl2'});

        expect(console.log.calledOnce).to.be.true;
        expect(ctrl1._port.postMessage.calledOnce).to.be.true;
        expect(ctrl2._port.postMessage.called).to.be.false;

        console.log.restore();
      });

      it('should throw for invalid input', () => {
        expect(ctrl1.on.bind({})).to.throw(/Invalid/);
        expect(ctrl2.emit.bind({})).to.throw(/Invalid/);
      });
    });
  });
});

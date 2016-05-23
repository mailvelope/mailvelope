/* global mvelo */

'use strict';

describe('mvelo unit tests', function() {

  describe('deDup', function() {
    it('should work for undefined', function() {
      expect(mvelo.util.deDup()).to.deep.equal([]);
    });
    it('should work for empty array', function() {
      expect(mvelo.util.deDup([])).to.deep.equal([]);
    });
    it('should work for unsorted array', function() {
      expect(mvelo.util.deDup(['c', 'b', 'a', 'b'])).to.deep.equal(['c', 'b', 'a']);
    });
  });

  describe('checkEmail', function() {
    it('should be false for undefined', function() {
      expect(mvelo.util.checkEmail()).to.be.false;
    });
    it('should be false empty string', function() {
      expect(mvelo.util.checkEmail('')).to.be.false;
    });
    it('should be false special char at the beginning', function() {
      expect(mvelo.util.checkEmail('>foo@bar.co')).to.be.false;
    });
    it('should be false special char at the end', function() {
      expect(mvelo.util.checkEmail('foo@bar.co>')).to.be.false;
    });
    it('should be false no @', function() {
      expect(mvelo.util.checkEmail('foobar.co')).to.be.false;
    });
    it('should be false no .', function() {
      expect(mvelo.util.checkEmail('foo@barco')).to.be.false;
    });
    it('should be true fo valid email address', function() {
      expect(mvelo.util.checkEmail('foo@bar.co')).to.be.true;
    });
  });

  describe('Port message event handling', function() {
    var ctrl, port1, port2;

    beforeEach(function() {
      ctrl = new mvelo.EventHandler();
      ctrl._senderId = 'sender1';
      ctrl._port = port1 = {name: 'foo', postMessage: ctrl.handlePortMessage.bind(ctrl)};
      sinon.spy(port1, 'postMessage');
      port2 = {name: 'bar', postMessage: ctrl.handlePortMessage.bind(ctrl)};
      sinon.spy(port2, 'postMessage');
    });

    describe('Event handling via "on" and "emit"', function() {
      it('should work with main port', function(done) {
        expect(ctrl._handlers).to.not.exist;
        ctrl.on('blub', function(msg) {
          expect(ctrl._handlers).to.exist;
          expect(msg.data).to.equal('hello');
          expect(msg.event).to.equal('blub');
          expect(port1.postMessage.withArgs({event:'blub', sender:'sender1', data:'hello'}).calledOnce).to.be.true;
          expect(port2.postMessage.called).to.be.false;
          done();
        });

        ctrl.emit('blub', {data: 'hello'});
      });

      it('should work with second port', function(done) {
        ctrl.on('blub', function(msg) {
          expect(port1.postMessage.called).to.be.false;
          expect(port2.postMessage.withArgs({event:'blub', sender:'sender2', data:'hello'}).calledOnce).to.be.true;
          done();
        });

        ctrl.emit('blub', {data:'hello', sender:'sender2'}, port2);
      });

      it('should log for unknown event', function() {
        sinon.stub(console, 'log');

        ctrl.emit('unknown');

        expect(console.log.calledOnce).to.be.true;
        expect(port1.postMessage.calledOnce).to.be.true;
        expect(port2.postMessage.called).to.be.false;

        console.log.restore();
      });

      it('should throw for invalid input', function() {
        expect(ctrl.on.bind(ctrl)).to.throw(/Invalid/);
        expect(ctrl.emit.bind(ctrl)).to.throw(/Invalid/);
      });
    });

  });

});

'use strict';


import * as sub from '../../src/controller/sub.controller';

describe('Sub controller unit tests', function() {
  var ctrl, port;

  beforeEach(function() {
    port = {name: 'foo', postMessage(opt) { ctrl.handlePortMessage(opt); }};
    sinon.spy(port, 'postMessage');
    ctrl = new sub.SubController(port);
  });

  describe('Event handling via "on" and "emit"', function() {
    it('should be wired up correctly', function(done) {
      ctrl.on('ping', function(msg) {
        expect(msg.data).to.equal('pong');
        done();
      });

      ctrl.emit('ping', {data: 'pong'});
    });
  });

});

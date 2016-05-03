'use strict';

define([], function() {

  describe('ADM example unit test', function() {
    it('should work', function() {
      return new Promise(function(resolve) {
        resolve(true)
      }).then(function(result) {
        expect(result).to.be.true;
      });
    });
  });

});

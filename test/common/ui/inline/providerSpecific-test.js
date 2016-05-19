/* global mvelo */

'use strict';

describe('Provider specific content-script unit tests', function() {
  var testElem;

  beforeEach(function() {
    testElem = $('<div id="testElem"></div>');
    $(document.body).append(testElem);
  });

  afterEach(function() {
    testElem.remove();
  });

  describe('providers.init', function() {
    it('should work', function() {
      mvelo.providers.init();
      expect(mvelo.providers.map).to.exist;
    });
  });

  describe('providers.get', function() {
    beforeEach(function() {
      mvelo.providers.init();
    });

    it('should return default module for generic case', function() {
      var api = mvelo.providers.get('mail.some-generic-provider.com');
      expect(api instanceof mvelo.providers.Default).to.be.true;
    });

    it('should return Gmail module', function() {
      var api = mvelo.providers.get('mail.google.com');
      expect(api instanceof mvelo.providers.Gmail).to.be.true;
    });
  });

  describe('Default module', function() {
    var defMod;

    beforeEach(function() {
      mvelo.providers.init();
      defMod = mvelo.providers.get('mail.some-generic-provider.com');
    });

    describe('getRecipients', function() {
      it('should work', function() {
        testElem.append('<span>test1@example.com</span><input value="test2@example.com"></input><textarea>test3@example.com</textarea>');

        var recipients = defMod.getRecipients();

        expect(recipients.length).to.equal(3);
        expect(recipients[0].email).to.equal('test1@example.com');
        expect(recipients[1].email).to.equal('test2@example.com');
        expect(recipients[2].email).to.equal('test3@example.com');
      });
    });

    describe('setRecipients', function() {
      it('should work', function() {
        defMod.getRecipients();
      });
    });
  });

  describe('Gmail module', function() {
    var gmail;

    beforeEach(function() {
      mvelo.providers.init();
      gmail = mvelo.providers.get('mail.google.com');
    });

    describe('getRecipients', function() {
      it('should work', function() {
        testElem.append('<div class="vR"><span email="test1@example.com"><div class="vT">Test User</div></span></div>');
        testElem.append('<div class="oL aDm"><span email="test2@example.com"><div class="vT">Test User</div></span></div>');

        var recipients = gmail.getRecipients();

        expect(recipients.length).to.equal(2);
        expect(recipients[0].email).to.equal('test1@example.com');
        expect(recipients[1].email).to.equal('test2@example.com');
      });
    });

    describe('setRecipients', function() {
      beforeEach(function() {
        testElem.append('<div class="oL aDm"></div>');
        testElem.append('<textarea class="vO"></textarea>');
      });

      it('should work', function() {
        var toSet = [{name: 'Test 1', email: 'test1@example.com'}, {name: 'Test 2', email: 'test2@example.com'}];

        gmail.setRecipients(toSet);
        var recipients = gmail.getRecipients();

        expect(recipients.length).to.equal(2);
        expect(recipients[0].email).to.equal('test1@example.com');
        expect(recipients[1].email).to.equal('test2@example.com');
        expect($('.oL.aDm').children().eq(0).text()).to.equal('Test 1 (test1@example.com)');
        expect($('.oL.aDm').children().eq(1).text()).to.equal('Test 2 (test2@example.com)');
        expect($('.vO').text()).to.equal('test1@example.com, test2@example.com');
      });

      it('should work for undefined', function() {
        gmail.setRecipients(undefined);
        var recipients = gmail.getRecipients();

        expect(recipients.length).to.equal(0);
      });

      it('should not inject script', function() {
        var toSet = [{email: '<script>alert("xss")</script>'}];

        gmail.setRecipients(toSet);
        var recipients = gmail.getRecipients();

        expect(recipients.length).to.equal(0);
      });
    });
  });

});

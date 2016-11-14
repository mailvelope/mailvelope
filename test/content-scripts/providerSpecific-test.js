
import * as providers from '../../src/content-scripts/providerSpecific';


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
      providers.init();
    });
  });

  describe('providers.get', function() {
    beforeEach(function() {
      providers.init();
    });

    it('should return default module for generic case', function() {
      var api = providers.get('mail.some-generic-provider.com');
      expect(api.constructor.name === 'Default').to.be.true;
    });

    it('should return Gmail module', function() {
      var api = providers.get('mail.google.com');
      expect(api.constructor.name === 'Gmail').to.be.true;
    });
  });

  describe('Default module', function() {
    var defMod;

    beforeEach(function() {
      providers.init();
      defMod = providers.get('mail.some-generic-provider.com');
    });

    describe('getRecipients', function() {
      it('should work', function() {
        defMod.getRecipients();
      });
    });

    describe('setRecipients', function() {
      it('should work', function() {
        defMod.setRecipients();
      });
    });
  });

  describe('Gmail module', function() {
    var gmail;

    beforeEach(function() {
      providers.init();
      gmail = providers.get('mail.google.com');
    });

    describe('getRecipients', function() {

      it('should work', function() {
        testElem.append('<div class="vR"><span email="test1@example.com"><div class="vT">Test User</div></span></div>');
        testElem.append('<div class="oL aDm"><span email="test2@example.com"><div class="vT">Test User</div></span></div>');

        return gmail.getRecipients()
        .then(recipients => {
          expect(recipients.length).to.equal(2);
          expect(recipients[0].email).to.equal('test1@example.com');
          expect(recipients[1].email).to.equal('test2@example.com');
        });
      });

      it('should work for long TLD', function() {
        testElem.append('<div class="vR"><span email="test1@example.software"><div class="vT">Test User</div></span></div>');

        return gmail.getRecipients()
        .then(recipients => {
          expect(recipients.length).to.equal(1);
          expect(recipients[0].email).to.equal('test1@example.software');
        });
      });
    });

    describe('setRecipients', function() {
      beforeEach(function() {
        testElem.append('<div class="aoD hl"></div>');
        testElem.append('<div class="fX"><div class="vR"><span class="vM"></span></div><textarea class="vO"></textarea></div>');
      });

      it('should clear email address text input', function() {
        var toSet = [{name: 'Test 1', email: 'test1@example.com'}, {name: 'Test 2', email: 'test2@example.com'}];

        $('.fX .vO').val('test1@example.com');

        gmail.setRecipients({recipients: toSet});

        expect($('.fX .vO').val()).to.be.empty;
      });

      it('should trigger click event on email remove buttons', function(done) {
        var toSet = [{name: 'Test 1', email: 'test1@example.com'}, {name: 'Test 2', email: 'test2@example.com'}];

        $('.fX .vR .vM').on('click', function() {
          done();
        });

        gmail.setRecipients({recipients: toSet});
      });

      it('should set joined email addresses to input field', function(done) {
        var toSet = [{name: 'Test 1', email: 'test1@example.com'}, {name: 'Test 2', email: 'test2@example.com'}];

        gmail.setRecipients({recipients: toSet});

        setTimeout(function() {
          expect($('.fX .vO').val()).to.equal('test1@example.com, test2@example.com');
          done();
        }, 10);
      });

      it('should work for undefined', function() {
        gmail.setRecipients({});
        return gmail.getRecipients()
        .then(recipients => {
          expect(recipients.length).to.equal(0);
        });
      });

      it('should not inject script', function() {
        var toSet = [{email: '<script>alert("xss")</script>'}];

        gmail.setRecipients({recipients: toSet});
        return gmail.getRecipients()
        .then(recipients => {
          expect(recipients.length).to.equal(0);
        });
      });
    });
  });

});

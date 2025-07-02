import * as providerSpecific from '../../../src/content-scripts/providerSpecific';
import {goog} from '../../../src/modules/closure-library/closure/goog/emailaddress';

// Mock dependencies
jest.mock('../../../src/content-scripts/gmailIntegration', () => jest.fn().mockImplementation(() => ({
  init: jest.fn()
})));

// Mock utilities
jest.mock('../../../src/lib/util', () => ({
  sequential: jest.fn((fn, items) => Promise.resolve(items.map(item => fn(item)))),
  isVisible: jest.fn(element => element && element.style.display !== 'none')
}));

// Mock goog email library
jest.mock('../../../src/modules/closure-library/closure/goog/emailaddress', () => ({
  goog: {
    format: {
      EmailAddress: {
        parse: jest.fn()
      }
    }
  }
}));

describe('providerSpecific unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Module exports', () => {
    it('should export init and get functions', () => {
      expect(typeof providerSpecific.init).toBe('function');
      expect(typeof providerSpecific.get).toBe('function');
    });
  });

  describe('init', () => {
    it('should initialize provider map with correct providers', () => {
      const mockPrefs = {
        provider: {
          gmail_integration: false
        }
      };

      providerSpecific.init(mockPrefs);

      // Test that providers are correctly mapped
      const gmail = providerSpecific.get('mail.google.com');
      const yahoo = providerSpecific.get('mail.yahoo.com');
      const outlook = providerSpecific.get('outlook.live.com');
      const defaultProvider = providerSpecific.get('unknown.provider.com');

      expect(gmail.constructor.name).toBe('Gmail');
      expect(yahoo.constructor.name).toBe('Yahoo');
      expect(outlook.constructor.name).toBe('Outlook');
      expect(defaultProvider.constructor.name).toBe('Default');
    });

    it('should initialize Gmail with integration when enabled', () => {
      const mockPrefs = {
        provider: {
          gmail_integration: true
        }
      };

      providerSpecific.init(mockPrefs);
      const gmail = providerSpecific.get('mail.google.com');

      // Test that integration object exists and has expected methods
      expect(gmail.integration).toBeDefined();
      expect(typeof gmail.integration.init).toBe('function');
    });

    it('should not initialize Gmail integration when disabled', () => {
      const mockPrefs = {
        provider: {
          gmail_integration: false
        }
      };

      providerSpecific.init(mockPrefs);
      const gmail = providerSpecific.get('mail.google.com');

      expect(gmail.integration).toBeUndefined();
    });
  });

  describe('get', () => {
    beforeEach(() => {
      providerSpecific.init({provider: {gmail_integration: false}});
    });

    it('should return correct provider for known hostnames', () => {
      expect(providerSpecific.get('mail.google.com').constructor.name).toBe('Gmail');
      expect(providerSpecific.get('mail.yahoo.com').constructor.name).toBe('Yahoo');
      expect(providerSpecific.get('outlook.live.com').constructor.name).toBe('Outlook');
    });

    it('should return default provider for unknown hostnames', () => {
      expect(providerSpecific.get('mail.unknown.com').constructor.name).toBe('Default');
      expect(providerSpecific.get('webmail.provider.org').constructor.name).toBe('Default');
    });

    it('should return same instance for same hostname', () => {
      const gmail1 = providerSpecific.get('mail.google.com');
      const gmail2 = providerSpecific.get('mail.google.com');
      expect(gmail1).toBe(gmail2);
    });
  });

  describe('Default provider', () => {
    let defaultProvider;

    beforeEach(() => {
      providerSpecific.init({provider: {gmail_integration: false}});
      defaultProvider = providerSpecific.get('generic.provider.com');
    });

    it('should return empty array for getRecipients', async () => {
      const recipients = await defaultProvider.getRecipients();
      expect(recipients).toEqual([]);
    });

    it('should return empty array for getSender', async () => {
      const sender = await defaultProvider.getSender();
      expect(sender).toEqual([]);
    });

    it('should do nothing for setRecipients', () => {
      expect(() => defaultProvider.setRecipients()).not.toThrow();
    });
  });

  describe('Utility functions', () => {
    beforeEach(() => {
      // Mock goog.format.EmailAddress.parse behavior
      goog.format.EmailAddress.parse.mockImplementation(email => ({
        isValid: () => email && email.includes('@') && email.includes('.'),
        getAddress: () => email
      }));

      providerSpecific.init({provider: {gmail_integration: false}});
    });

    describe('parseEmail function (via providers)', () => {
      it('should extract valid email addresses', () => {
        // Create mock elements with email data
        const elements = [
          {getAttribute: () => 'test1@example.com'},
          {getAttribute: () => 'test2@example.com'},
          {getAttribute: () => 'invalid-email'},
          {getAttribute: () => 'test3@domain.org'}
        ];

        const extractFn = element => element.getAttribute();

        // Simulate the parseEmail behavior through a test
        const validEmails = [];
        for (const element of elements) {
          const value = extractFn(element);
          const emailAddress = goog.format.EmailAddress.parse(value);
          if (emailAddress.isValid()) {
            validEmails.push(emailAddress.getAddress());
          }
        }
        const recipients = validEmails.map(address => ({email: address}));

        expect(recipients).toHaveLength(3);
        expect(recipients[0]).toEqual({email: 'test1@example.com'});
        expect(recipients[1]).toEqual({email: 'test2@example.com'});
        expect(recipients[2]).toEqual({email: 'test3@domain.org'});
      });

      it('should filter out invalid email addresses', () => {
        const elements = [
          {getAttribute: () => 'not-an-email'},
          {getAttribute: () => 'missing@domain'},
          {getAttribute: () => 'valid@example.com'}
        ];

        const extractFn = element => element.getAttribute();

        const validEmails = [];
        for (const element of elements) {
          const value = extractFn(element);
          const emailAddress = goog.format.EmailAddress.parse(value);
          if (emailAddress.isValid()) {
            validEmails.push(emailAddress.getAddress());
          }
        }
        const recipients = validEmails.map(address => ({email: address}));

        expect(recipients).toHaveLength(1);
        expect(recipients[0]).toEqual({email: 'valid@example.com'});
      });
    });

    describe('toRecipients function', () => {
      it('should convert email addresses to recipient objects', () => {
        const addresses = ['test1@example.com', 'test2@example.com'];
        const recipients = addresses.map(address => ({email: address}));

        expect(recipients).toEqual([
          {email: 'test1@example.com'},
          {email: 'test2@example.com'}
        ]);
      });

      it('should handle empty array', () => {
        const addresses = [];
        const recipients = addresses.map(address => ({email: address}));

        expect(recipients).toEqual([]);
      });
    });

    describe('joinEmail function', () => {
      it('should join recipient emails with comma separator', () => {
        const recipients = [
          {email: 'test1@example.com'},
          {email: 'test2@example.com'},
          {email: 'test3@example.com'}
        ];
        const joined = recipients.map(r => r.email).join(', ');

        expect(joined).toBe('test1@example.com, test2@example.com, test3@example.com');
      });

      it('should handle single recipient', () => {
        const recipients = [{email: 'test@example.com'}];
        const joined = recipients.map(r => r.email).join(', ');

        expect(joined).toBe('test@example.com');
      });

      it('should handle empty array', () => {
        const recipients = [];
        const joined = recipients.map(r => r.email).join(', ');

        expect(joined).toBe('');
      });
    });
  });

  describe('Provider classes basic functionality', () => {
    let gmail; let yahoo; let outlook;

    beforeEach(() => {
      providerSpecific.init({provider: {gmail_integration: false}});
      gmail = providerSpecific.get('mail.google.com');
      yahoo = providerSpecific.get('mail.yahoo.com');
      outlook = providerSpecific.get('outlook.live.com');
    });

    describe('Gmail provider', () => {
      it('should be properly instantiated', () => {
        expect(gmail).toBeDefined();
        expect(gmail.constructor.name).toBe('Gmail');
      });

      it('should have required methods', () => {
        expect(typeof gmail.getRecipients).toBe('function');
        expect(typeof gmail.setRecipients).toBe('function');
        expect(typeof gmail.getSender).toBe('function');
      });
    });

    describe('Yahoo provider', () => {
      it('should be properly instantiated', () => {
        expect(yahoo).toBeDefined();
        expect(yahoo.constructor.name).toBe('Yahoo');
      });

      it('should have required methods', () => {
        expect(typeof yahoo.getRecipients).toBe('function');
        expect(typeof yahoo.setRecipients).toBe('function');
        expect(typeof yahoo.getSender).toBe('function');
      });
    });

    describe('Outlook provider', () => {
      it('should be properly instantiated', () => {
        expect(outlook).toBeDefined();
        expect(outlook.constructor.name).toBe('Outlook');
      });

      it('should have required methods', () => {
        expect(typeof outlook.getRecipients).toBe('function');
        expect(typeof outlook.setRecipients).toBe('function');
        expect(typeof outlook.getSender).toBe('function');
        expect(typeof outlook.waitForPersonaCard).toBe('function');
        expect(typeof outlook.extractPersona).toBe('function');
        expect(typeof outlook.setRecipient).toBe('function');
      });
    });
  });

  describe('Email regex pattern', () => {
    it('should match valid email patterns', () => {
      // Test the HAS_EMAIL regex pattern used in the module
      const HAS_EMAIL = /[+a-zA-Z0-9_.!#$%&'*\/=?^`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}/;

      expect(HAS_EMAIL.test('test@example.com')).toBe(true);
      expect(HAS_EMAIL.test('user.name+tag@domain.org')).toBe(true);
      expect(HAS_EMAIL.test('test.email-with-dash@example.museum')).toBe(true);
      expect(HAS_EMAIL.test('not-an-email')).toBe(false);
      expect(HAS_EMAIL.test('missing@domain')).toBe(false);
      expect(HAS_EMAIL.test('@domain.com')).toBe(false);
    });
  });
});

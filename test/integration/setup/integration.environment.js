const {TestEnvironment: PuppeteerEnvironment} = require('jest-environment-puppeteer');

class IntegrationEnvironment extends PuppeteerEnvironment {
  constructor(config, context) {
    super(config, context);
    // Workaround: Recent Puppeteer versions throw SecurityError when accessing localStorage
    // without --localstorage-file flag. We use browser-based storage in tests instead.
    delete this.global.localStorage;
  }
}

module.exports = IntegrationEnvironment;

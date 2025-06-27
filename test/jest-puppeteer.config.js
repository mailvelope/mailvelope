module.exports = {
  launch: {
    headless: process.env.HEADLESS !== 'false',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
    dumpio: process.env.DEBUG === 'true'
  },
  // Share browser instance for performance
  browserContext: 'default',
  // No server needed for our tests
  server: null
};


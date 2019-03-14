
module.exports = [
  require('./webpack.app').dev,
  require('./webpack.css').dev,
  require('./webpack.api').dev,
  require('./webpack.cs').dev,
  ...require('./webpack.comp').dev,
  require('./webpack.background').dev
];

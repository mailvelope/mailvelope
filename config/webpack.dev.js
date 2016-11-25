
module.exports = [
  require('./webpack.app').dev,
  require('./webpack.cs').dev,
  ...require('./webpack.comp').dev,
  require('./webpack.chrome').dev,
  require('./webpack.firefox').dev,
];

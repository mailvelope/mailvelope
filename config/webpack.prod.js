
module.exports = [
  require('./webpack.app').prod,
  require('./webpack.css').prod,
  require('./webpack.api').prod,
  require('./webpack.cs').prod,
  ...require('./webpack.comp').prod,
  require('./webpack.background').prod
];

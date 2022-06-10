
module.exports = [
  require('./webpack.app').prod,
  ...require('./webpack.comp').prod,
  require('./webpack.background').prod,
  require('./webpack.css').prod,
  require('./webpack.cs').prod,
  require('./webpack.api').prod
];

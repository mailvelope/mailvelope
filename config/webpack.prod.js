
module.exports = [
  require('./webpack.app').prod,
  require('./webpack.cs').prod,
  require('./webpack.chrome').prod,
  require('./webpack.firefox').prod,
];

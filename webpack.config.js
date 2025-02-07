// webpack.config.js
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './src/script.ts',  // Entry file for bundling
  output: {
    filename: 'bundle.js',   // Output bundled file name
    path: path.resolve(__dirname, 'public') // Output directory for the bundle
  },
  resolve: {
    extensions: ['.ts', '.js'], // Resolve these extensions
  },
  module: {
    rules: [
      {
        test: /\.ts$/, // Match .ts files
        use: 'ts-loader', // Use ts-loader to transpile TypeScript
        exclude: /node_modules/, // Ignore node_modules
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
      }
    ],
  },
  mode: 'production', // Set mode to production for optimized bundle

};
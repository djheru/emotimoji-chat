const webpack = require('webpack');

module.exports = {
  webpack: (config) => {
    // Configure webpack to provide the env variables to React
    const env = Object.keys(process.env).reduce((acc, curr) => {
      acc[`process.env.${curr}`] = JSON.stringify(process.env[curr]);
      return acc;
    }, {});

    config.plugins.push(new webpack.DefinePlugin(env));
    return config;
  }
};

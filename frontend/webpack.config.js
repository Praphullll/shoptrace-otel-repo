const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    entry: './src/index.js',

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isDev ? 'bundle.js' : 'bundle.[contenthash].js',
      clean: true,
      publicPath: '/',
    },

    module: {
      rules: [
        {
          test: /\.css$/,
          use: isDev
            ? ['style-loader', 'css-loader']
            : [MiniCssExtractPlugin.loader, 'css-loader'],
        },
      ],
    },

    plugins: [
      new Dotenv({ safe: true, systemvars: true }),
      new HtmlWebpackPlugin({
        template: './public/index.html',
        favicon: false,
      }),
      ...(isDev
        ? []
        : [new MiniCssExtractPlugin({ filename: 'styles.[contenthash].css' })]),
    ],

    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      port: 8080,
      hot: true,
      historyApiFallback: true,
      proxy: [
        {
          context: ['/products', '/orders', '/health', '/simulate'],
          target: process.env.BACKEND_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      ],
    },

    optimization: {
      splitChunks: {
        chunks: 'all',
      },
    },

    resolve: {
      extensions: ['.js'],
    },
  };
};

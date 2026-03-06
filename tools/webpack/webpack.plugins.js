/* eslint-disable @typescript-eslint/no-var-requires */
const webpack = require("webpack");
const dotenv = require("dotenv");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const { inDev } = require("./webpack.helpers");

dotenv.config();

module.exports = [
  new ForkTsCheckerWebpackPlugin(),
  inDev() && new webpack.HotModuleReplacementPlugin(),
  inDev() && new ReactRefreshWebpackPlugin(),
  new webpack.DefinePlugin({
    "process.env.MAPTILER_API_KEY": JSON.stringify(
      process.env.MAPTILER_API_KEY || ""
    ),
  }),
].filter(Boolean);

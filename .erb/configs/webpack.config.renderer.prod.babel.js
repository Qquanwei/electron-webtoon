/**
 * Build config for electron renderer process
 */

import path from "path";
import webpack from "webpack";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import { merge } from "webpack-merge";
import TerserPlugin from "terser-webpack-plugin";
import baseConfig from "./webpack.config.base";
import CheckNodeEnv from "../scripts/CheckNodeEnv";
import DeleteSourceMaps from "../scripts/DeleteSourceMaps";

CheckNodeEnv("production");
DeleteSourceMaps();

const devtoolsConfig =
  process.env.DEBUG_PROD === "true"
    ? {
        devtool: "source-map",
      }
    : {};

export default merge(baseConfig, {
  ...devtoolsConfig,

  mode: "production",

  target: "electron-renderer",

  entry: [
    "core-js",
    "regenerator-runtime/runtime",
    path.join(__dirname, "../../src/client/index.tsx"),
  ],

  output: {
    path: path.join(__dirname, "../../src/dist"),
    publicPath: "./dist/",
    filename: "renderer.prod.js",
  },

  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../../src/shared"),
      "@components": path.resolve(__dirname, "../../src/client/components"),
      "@client": path.resolve(__dirname, "../../src/client"),
      "@imgs": path.resolve(__dirname, "../../src/client/imgs"),
      shared: path.resolve(__dirname, "../../src/shared-electron"),
    },
  },

  module: {
    rules: [
      {
        test: /\.global\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              // `./dist` can't be inerhited for publicPath for styles. Otherwise generated paths will be ./dist/dist
              publicPath: "./",
            },
          },
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
            },
          },
          {
            loader: "postcss-loader",
          },
        ],
      },
      {
        test: /^((?!\.global).)*\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              // `./dist` can't be inerhited for publicPath for styles. Otherwise generated paths will be ./dist/dist
              publicPath: "./",
            },
          },
          {
            loader: "css-loader",
            options: {
              modules: {
                localIdentName: "[name]__[local]__[hash:base64:5]",
              },
              sourceMap: true,
              importLoaders: 1,
            },
          },
        ],
      },
      // WOFF Font
      {
        test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
        use: {
          loader: "url-loader",
          options: {
            limit: 10000,
            mimetype: "application/font-woff",
          },
        },
      },
      // WOFF2 Font
      {
        test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
        use: {
          loader: "url-loader",
          options: {
            limit: 10000,
            mimetype: "application/font-woff",
          },
        },
      },
      // OTF Font
      {
        test: /\.otf(\?v=\d+\.\d+\.\d+)?$/,
        use: {
          loader: "url-loader",
          options: {
            limit: 10000,
            mimetype: "font/otf",
          },
        },
      },
      // TTF Font
      {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        use: {
          loader: "url-loader",
          options: {
            limit: 10000,
            mimetype: "application/octet-stream",
          },
        },
      },
      // EOT Font
      {
        test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
        use: "file-loader",
      },
      // SVG Font
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        use: {
          loader: "url-loader",
          options: {
            limit: 10000,
            mimetype: "image/svg+xml",
          },
        },
      },
      // Common Image Formats
      {
        test: /\.(?:ico|gif|png|jpg|jpeg|webp)$/,
        use: "url-loader",
      },
    ],
  },

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
      }),
      new CssMinimizerPlugin(),
    ],
  },

  plugins: [
    /**
     * Create global constants which can be configured at compile time.
     *
     * Useful for allowing different behaviour between development builds and
     * release builds
     *
     * NODE_ENV should be production so that modules do not perform certain
     * development checks
     */
    new webpack.EnvironmentPlugin({
      NODE_ENV: "production",
      DEBUG_PROD: false,
    }),

    new MiniCssExtractPlugin({
      filename: "style.css",
    }),

    new BundleAnalyzerPlugin({
      analyzerMode:
        process.env.OPEN_ANALYZER === "true" ? "server" : "disabled",
      openAnalyzer: process.env.OPEN_ANALYZER === "true",
    }),
  ],
});

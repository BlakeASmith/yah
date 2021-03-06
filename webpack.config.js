const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
module.exports = {
  mode: "production",
  entry: {
    background: path.resolve(__dirname, ".", "src", "background.ts"),
    content: path.resolve(__dirname, ".", "src", "content.tsx"),
  },
  output: {
    path: path.join(__dirname, "./dist"),
    filename: "[name].js",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: "./manifest.json",
          to: "./manifest.json",
          context: ".",
        },
        {
          from: "./stylesheet.css",
          to: "./stylesheet.css",
          context: ".",
        },
        {
          from: "./images",
          to: "./images",
          context: ".",
        },
      ],
    }),
  ],
};

/* eslint global-require: off, import/no-extraneous-dependencies: off */

const developmentEnvironments = ["development", "test"];

const developmentPlugins = [require("@babel/plugin-transform-runtime")];

const productionPlugins = [
  require("babel-plugin-dev-expression"),

  // babel-preset-react-optimize
  require("@babel/plugin-transform-react-constant-elements"),
  require("@babel/plugin-transform-react-inline-elements"),
  require("babel-plugin-transform-react-remove-prop-types"),
];
module.exports = (api) => {
  // See docs about api at https://babeljs.io/docs/en/config-files#apicache

  const development = api.env(developmentEnvironments);

  return {
    presets: [
      // @babel/preset-env will automatically target our browserslist targets
      require("@babel/preset-env", {
        useBuiltins: "entry",
        corejs: 3,
      }),
      require("@babel/preset-typescript"),
      [require("@babel/preset-react"), { development }],
    ],
    plugins: [
      // Stage 1
      ["@babel/plugin-transform-react-jsx", {
        runtime: "automatic"
      }],
      require("@babel/plugin-proposal-export-default-from"),
      require("@babel/plugin-proposal-logical-assignment-operators"),
      [require("@babel/plugin-proposal-optional-chaining"), { loose: false }],
      [
        require("@babel/plugin-proposal-pipeline-operator"),
        { proposal: "minimal" },
      ],
      [
        require("@babel/plugin-proposal-nullish-coalescing-operator"),
        { loose: false },
      ],
      require("@babel/plugin-proposal-do-expressions"),

      // Stage 2
      require("@babel/plugin-proposal-function-sent"),
      require("@babel/plugin-proposal-export-namespace-from"),
      require("@babel/plugin-proposal-throw-expressions"),

      // Stage 3
      require("@babel/plugin-syntax-dynamic-import"),
      require("@babel/plugin-syntax-import-meta"),
      require("@babel/plugin-proposal-json-strings"),

      ...(development ? developmentPlugins : productionPlugins),
    ],
  };
};

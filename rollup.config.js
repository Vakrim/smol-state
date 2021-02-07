import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import typescript from "rollup-plugin-typescript";
import pkg from "./package.json";

export default [
  // browser-friendly UMD build
  {
    input: "dist/esm/main.js",
    output: {
      name: "smolState",
      file: pkg.browser,
      format: "umd",
    },
    plugins: [resolve(), commonjs(), typescript()],
  },
];

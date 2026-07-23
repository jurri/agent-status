import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

const isWatching = !!process.env.ROLLUP_WATCH;
const pluginFolder = "com.jurri.agent-status.sdPlugin";

export default {
  input: "src/plugin.ts",

  output: {
    file: `${pluginFolder}/bin/plugin.js`,
    format: "es",
    sourcemap: isWatching
  },

  plugins: [
    {
      name: "watch-manifest",
      buildStart() {
        this.addWatchFile(`${pluginFolder}/manifest.json`);
      }
    },

    typescript(),

    resolve({
      preferBuiltins: true
    }),

    commonjs(),

    !isWatching && terser(),

    {
      name: "emit-package-json",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "package.json",
          source: JSON.stringify(
            {
              type: "module"
            },
            null,
            2
          )
        });
      }
    }
  ]
};
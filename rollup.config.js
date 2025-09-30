import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';

const dev = process.env.ROLLUP_WATCH;

export default {
  input: 'src/room-card.ts',
  output: {
    file: 'dist/room-card.js',
    format: 'es',
    sourcemap: dev ? true : false,
    inlineDynamicImports: true,
  },
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false,
      declarationMap: false,
    }),
    json(),
    !dev &&
      terser({
        compress: {
          drop_console: false,
        },
        output: {
          comments: false,
        },
      }),
  ].filter(Boolean),
  watch: {
    exclude: 'node_modules/**',
    clearScreen: false,
  },
};
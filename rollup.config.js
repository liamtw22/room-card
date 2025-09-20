import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';

const dev = process.env.ROLLUP_WATCH;

export default {
  input: 'src/room-card.ts',
  output: {
    file: 'dist/room-card.js',
    format: 'es',
    sourcemap: dev ? true : false,
    compact: !dev,
    generatedCode: {
      constBindings: true
    }
  },
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    json(),
    typescript({
      sourceMap: dev,
      inlineSources: dev,
      tsconfig: './tsconfig.json'
    }),
    !dev && terser({
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    })
  ].filter(Boolean),
  preserveEntrySignatures: false,
  external: [],
  onwarn(warning, warn) {
    // Skip certain warnings
    if (warning.code === 'THIS_IS_UNDEFINED') return;
    if (warning.code === 'CIRCULAR_DEPENDENCY' && 
        warning.importer && warning.importer.includes('node_modules')) return;
    warn(warning);
  }
};

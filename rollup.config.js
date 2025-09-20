import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';

const dev = process.env.ROLLUP_WATCH;

export default {
  input: 'src/room-card.ts',
  output: {
    file: 'dist/room-card.js',
    format: 'es',
    sourcemap: false
  },
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    json(),
    typescript({
      sourceMap: false,
      inlineSources: false,
      tsconfig: './tsconfig.json'
    })
  ],
  preserveEntrySignatures: false,
  onwarn(warning, warn) {
    // Skip certain warnings
    if (warning.code === 'THIS_IS_UNDEFINED') return;
    if (warning.code === 'CIRCULAR_DEPENDENCY' && 
        warning.importer && warning.importer.includes('node_modules')) return;
    warn(warning);
  }
};
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/room-card.ts',
  output: {
    file: 'dist/room-card.js',
    format: 'es',
    sourcemap: false,  // No sourcemap for cleaner release
    indent: '  ',       // Readable indentation
    generatedCode: {
      constBindings: true
    }
  },
  plugins: [
    resolve(),
    typescript({
      sourceMap: false,
      inlineSources: false
    })
    // NO terser plugin - keep it readable
  ]
};

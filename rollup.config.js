import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/room-card.ts',
  output: {
    file: 'room-card.js',
    format: 'es'
  },
  plugins: [
    resolve(),
    typescript(),
    terser({
      format: {
        comments: false
      }
    })
  ]
};
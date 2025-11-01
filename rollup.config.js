import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/main.js',
  output: {
    file: 'assets/bundle.js',
    format: 'esm',
    sourcemap: true
  },
  plugins: [
    resolve(),
    terser({
      ecma: 2020,
      module: true,
      compress: {
        passes: 2
      },
      format: {
        comments: false
      }
    })
  ]
};

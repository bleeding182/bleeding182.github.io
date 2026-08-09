import { rename } from 'node:fs/promises';
import path from 'node:path';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const outDir = 'assets';
const fileName = 'bundle.js';

// `bin/serve` runs `rollup -c -w` alongside Jekyll's file watcher, both
// pointed at assets/bundle.js. Rollup writes that file in place, which
// truncates it before the new content lands; if Jekyll's watcher rebuilds in
// that window it copies the empty file into _site, silently killing every
// script on the page until the next edit.
//
// Write into a dot-prefixed subdirectory instead - Jekyll's default entry
// filter never walks into paths starting with "." - then rename(2) the
// finished file into place. Rename within one filesystem is atomic, so the
// watcher only ever observes the complete old bundle or the complete new one,
// never a truncated one. Applies to plain `rollup -c` too, but there it's a
// no-op in effect: CI runs it before Jekyll ever starts.
const tmpDir = path.join(outDir, '.tmp');

function atomicMove() {
  return {
    name: 'atomic-move',
    async writeBundle() {
      await rename(path.join(tmpDir, fileName), path.join(outDir, fileName));
      await rename(path.join(tmpDir, `${fileName}.map`), path.join(outDir, `${fileName}.map`));
    }
  };
}

export default {
  input: 'src/main.js',
  output: {
    file: path.join(tmpDir, fileName),
    format: 'esm',
    sourcemap: true,
    // Source paths in the map are computed relative to the bundle's directory,
    // which would be the staging dir - leaving every path one level too deep
    // once the map is renamed into assets/. Point rollup at the final location
    // so it resolves them against where the map actually ends up.
    sourcemapFile: path.join(outDir, fileName)
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
    }),
    atomicMove()
  ]
};

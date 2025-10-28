#!/usr/bin/env node
import { build, context } from 'esbuild';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const watch = process.argv.includes('--watch');

const common = {
  bundle: true,
  platform: 'browser',
  target: ['es2019'],
  sourcemap: true,
  logLevel: 'info',
};

const entry = path.resolve(root, 'src/ts/compat/expose-globals.ts');
const outfile = path.resolve(root, 'js/app.bundle.js');

(async () => {
  if (watch) {
    const ctx = await context({
      ...common,
      entryPoints: [entry],
      outfile,
      format: 'iife',
      globalName: 'App',
    });
    await ctx.watch();
    console.log(`✔️  Built ${path.relative(root, outfile)} (watching)`);
  } else {
    await build({
      ...common,
      entryPoints: [entry],
      outfile,
      format: 'iife',
      globalName: 'App',
    });
    console.log(`✔️  Built ${path.relative(root, outfile)}`);
  }
})();

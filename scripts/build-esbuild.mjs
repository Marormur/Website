#!/usr/bin/env node
import { build, context } from 'esbuild';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const watch = process.argv.includes('--watch');
const analyze = process.argv.includes('--analyze');

const common = {
    bundle: true,
    platform: 'browser',
    target: ['es2019'],
    sourcemap: !watch, // Sourcemaps nur im Production-Build
    logLevel: 'info',
    metafile: analyze, // Metafile für Analyse
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
        const result = await build({
            ...common,
            entryPoints: [entry],
            outfile,
            format: 'iife',
            globalName: 'App',
        });

        console.log(`✔️  Built ${path.relative(root, outfile)}`);

        // Bundle-Größe anzeigen
        if (result.metafile) {
            const bundleSize = Object.values(result.metafile.outputs).reduce(
                (sum, output) => sum + output.bytes,
                0
            );
            const sizeKB = (bundleSize / 1024).toFixed(2);
            console.log(`📦 Bundle size: ${sizeKB} KB`);
        }
    }
})();

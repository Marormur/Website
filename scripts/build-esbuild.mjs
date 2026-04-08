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
    sourcemap: !watch, // Sourcemaps in production (separate .map file)
    logLevel: 'info',
    metafile: analyze, // Metafile für Analyse
    legalComments: 'none', // Strip license/legal comments to reduce size
    loader: {
        '.ttf': 'file',
        '.woff': 'file',
        '.woff2': 'file',
    },
};

const entry = path.resolve(root, 'src/ts/compat/expose-globals.ts');
const outfile = path.resolve(root, 'js/app.bundle.js');
const monacoWorkerOutdir = path.resolve(root, 'js/monaco-workers');
const monacoEditorWorkerEntry = path.resolve(
    root,
    'node_modules/monaco-editor/esm/vs/editor/editor.worker.js'
);
const monacoJsonWorkerEntry = path.resolve(
    root,
    'node_modules/monaco-editor/esm/vs/language/json/json.worker.js'
);

(async () => {
    if (watch) {
        const appCtx = await context({
            ...common,
            entryPoints: [entry],
            outfile,
            format: 'iife',
            globalName: 'App',
        });
        const workerCtx = await context({
            ...common,
            sourcemap: false,
            entryPoints: {
                'editor.worker': monacoEditorWorkerEntry,
                'json.worker': monacoJsonWorkerEntry,
            },
            outdir: monacoWorkerOutdir,
            format: 'iife',
            minify: true,
        });

        await Promise.all([appCtx.watch(), workerCtx.watch()]);
        console.log(`✔️  Built ${path.relative(root, outfile)} (watching)`);
        console.log(
            `✔️  Built Monaco workers in ${path.relative(root, monacoWorkerOutdir)} (watching)`
        );
    } else {
        const [result] = await Promise.all([
            build({
                ...common,
                entryPoints: [entry],
                outfile,
                format: 'iife',
                globalName: 'App',
                minify: true, // Minify in production: reduces bundle from ~915KB to ~445KB
            }),
            build({
                ...common,
                sourcemap: false,
                entryPoints: {
                    'editor.worker': monacoEditorWorkerEntry,
                    'json.worker': monacoJsonWorkerEntry,
                },
                outdir: monacoWorkerOutdir,
                format: 'iife',
                minify: true,
            }),
        ]);

        console.log(`✔️  Built ${path.relative(root, outfile)}`);
        console.log(`✔️  Built Monaco workers in ${path.relative(root, monacoWorkerOutdir)}`);

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

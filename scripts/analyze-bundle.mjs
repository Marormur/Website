#!/usr/bin/env node
/**
 * Bundle Analyzer Script
 * Analysiert die Größe des esbuild-Bundles und erstellt einen Report
 * Nutzt esbuild metafile für detaillierte Größen-Analysen
 */

import { build } from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';

const root = process.cwd();

async function analyzeBundle() {
    const entry = path.resolve(root, 'src/ts/compat/expose-globals.ts');
    const outfile = path.resolve(root, 'js/app.bundle.js');
    const metafile = path.resolve(root, 'js/bundle-metadata.json');

    try {
        console.log('📦 Building bundle for analysis...');

        const result = await build({
            bundle: true,
            platform: 'browser',
            target: ['es2019'],
            sourcemap: false,
            entryPoints: [entry],
            outfile,
            format: 'iife',
            globalName: 'App',
            minify: true,
            metafile: true,
            logLevel: 'silent',
        });

        if (result.metafile) {
            // Speichere Metafile für externe Tools
            fs.writeFileSync(metafile, JSON.stringify(result.metafile, null, 2));
            console.log(`✔️  Metafile saved: ${metafile}`);

            // Parse Bundle-Größe
            const outputs = result.metafile.outputs;
            let totalSize = 0;
            let totalGzip = 0;

            console.log('\n📊 Bundle Analysis:');
            console.log('─'.repeat(60));

            Object.entries(outputs).forEach(([file, info]) => {
                const sizeKB = (info.bytes / 1024).toFixed(2);
                totalSize += info.bytes;

                if (file.includes('app.bundle')) {
                    console.log(`File: ${path.basename(file)}`);
                    console.log(`Size: ${sizeKB} KB`);

                    // Imports-Analyse
                    if (info.imports && info.imports.length > 0) {
                        console.log(`Imports: ${info.imports.length}`);
                    }
                }
            });

            console.log('─'.repeat(60));
            console.log(`Total output: ${(totalSize / 1024).toFixed(2)} KB`);

            // Warnung bei zu großem Bundle (target: ≤700KB unminified, ≤500KB minified)
            const maxSize = 700; // KB (unminified target from performance issue)
            if (totalSize / 1024 > maxSize) {
                console.warn(
                    `⚠️  Bundle exceeds target size of ${maxSize}KB. Consider optimization.`
                );
            } else {
                console.log(`✅ Bundle size within target (<${maxSize}KB)`);
            }

            // Hinweis auf esbuild-bundle-analyzer (falls installiert)
            console.log('\n💡 For detailed visualization: npx esbuild-bundle-analyzer');
        }
    } catch (err) {
        console.error('❌ Bundle analysis failed:', err);
        process.exit(1);
    }
}

analyzeBundle();

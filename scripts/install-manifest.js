#!/usr/bin/env node
/**
 * Manifest swap script — copies `manifest/package.<target>.json` to the
 * extension root as `package.json`.
 *
 * Usage:
 *   node scripts/install-manifest.js 2x
 *   node scripts/install-manifest.js 3x
 *
 * Part of Task 2 (Phase B) — dual-manifest build for Cocos Creator 2.4.13
 * and 3.8.6+ targets. See plan §2.2 and §3.6.
 */

const fs = require('fs');
const path = require('path');

const ALLOWED = new Set(['2x', '3x']);

function main() {
    const target = process.argv[2];
    if (!target || !ALLOWED.has(target)) {
        console.error('Usage: node scripts/install-manifest.js <2x|3x>');
        process.exit(1);
    }

    const extensionRoot = path.resolve(__dirname, '..');
    const sourceFile = path.join(extensionRoot, 'manifest', `package.${target}.json`);
    const targetFile = path.join(extensionRoot, 'package.json');

    if (!fs.existsSync(sourceFile)) {
        console.error(`[install-manifest] Source manifest not found: ${sourceFile}`);
        process.exit(1);
    }

    const contents = fs.readFileSync(sourceFile, 'utf8');
    // Validate JSON before writing so a malformed manifest never overwrites
    // the extension root package.json with garbage.
    try {
        JSON.parse(contents);
    } catch (err) {
        console.error(`[install-manifest] Source manifest is not valid JSON: ${err.message}`);
        process.exit(1);
    }

    fs.writeFileSync(targetFile, contents);

    const engineLabel = target === '2x' ? 'Cocos Creator 2.4.13 (v1 manifest)' : 'Cocos Creator 3.8.6+ (v2 manifest)';
    console.log(`[install-manifest] Installed ${target} manifest → ${path.relative(extensionRoot, targetFile)}`);
    console.log(`[install-manifest] Active target: ${engineLabel}`);
}

main();

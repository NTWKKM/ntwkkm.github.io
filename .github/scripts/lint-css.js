/**
 * Enforce the DESIGN.md rules a machine can check:
 *
 *   1. Colours and font families are declared only in shared.css. Page
 *      stylesheets (every other root-level .css file) use tokens.
 *   2. No stylesheet transitions `all` or a layout property
 *      (width, height, top, left); motion is transform, opacity and colour.
 *
 * Run with: node .github/scripts/lint-css.js
 * Exits non-zero and prints file:line for each violation.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../');
const TOKEN_FILE = 'shared.css';

const COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab)\(/;
const LAYOUT_TRANSITION = /\btransition(?:-property)?\s*:[^;]*\b(?:all|width|height|top|left)\b/;

/** Blank out comments but keep line breaks, so line numbers stay true. */
const stripComments = css => css.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));

function lint(file, css) {
    const problems = [];
    stripComments(css).split('\n').forEach((line, i) => {
        const at = `${file}:${i + 1}`;
        if (LAYOUT_TRANSITION.test(line)) {
            problems.push(`${at} transitions a layout property or "all": ${line.trim()}`);
        }
        if (file === TOKEN_FILE) return;
        if (COLOUR.test(line)) problems.push(`${at} literal colour outside ${TOKEN_FILE}: ${line.trim()}`);
        if (/\bfont-family\s*:/.test(line) && !/var\(--font-/.test(line)) {
            problems.push(`${at} literal font-family outside ${TOKEN_FILE}: ${line.trim()}`);
        }
    });
    return problems;
}

function run() {
    const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.css')).sort();
    const problems = files.flatMap(f => lint(f, fs.readFileSync(path.join(ROOT, f), 'utf8')));
    if (problems.length) {
        console.error(problems.join('\n'));
        console.error(`\nlint-css: ${problems.length} problem(s) in ${files.length} file(s).`);
        process.exit(1);
    }
    console.log(`lint-css: clean, ${files.length} file(s).`);
}

if (require.main === module) run();

module.exports = { lint };

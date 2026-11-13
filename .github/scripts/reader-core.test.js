// Run with: node --test ".github/scripts/*.test.js"
const test = require('node:test');
const assert = require('node:assert');
const { tokenize, scorePost, highlightText, inline, parseSummary, generateCitation } = require('../../reader-core.js');

const paper = (title, extra = '') => ({ titleLc: title.toLowerCase(), hay: `${title} ${extra}`.toLowerCase() });

test('every search term must appear; title outranks tag, tag outranks summary', () => {
    const p = paper('Sepsis bundles in the ED', '12345 Infection');
    assert.strictEqual(scorePost(p, tokenize('sepsis')), 2);
    assert.strictEqual(scorePost(p, tokenize('infection')), 1);
    assert.strictEqual(scorePost(p, tokenize('lactate'), 'serum lactate was measured'), 0);
    assert.strictEqual(scorePost(p, tokenize('sepsis lactate')), -1);
    assert.strictEqual(scorePost(p, tokenize('SEPSIS  12345')), 3);
});

test('search matches Thai text as a plain substring', () => {
    assert.strictEqual(scorePost(paper('x'), tokenize('ผู้ป่วย'), 'ศึกษาในผู้ป่วยฉุกเฉิน'), 0);
});

test('highlight wraps matches and escapes everything else', () => {
    assert.strictEqual(highlightText('Sepsis <b>', 'sep'), '<mark class="search-highlight">Sep</mark>sis &lt;b&gt;');
    assert.strictEqual(highlightText('a.b', '.'), 'a<mark class="search-highlight">.</mark>b');
    assert.strictEqual(highlightText('<i>', ''), '&lt;i&gt;');
});

test('inline allows bold and nothing else', () => {
    assert.strictEqual(inline('**HR** 0.8 <script>'), '<strong>HR</strong> 0.8 &lt;script&gt;');
});

test('a summary splits on known labels, in Thai or English', () => {
    const sections = parseSummary([
        '- **วัตถุประสงค์:** เพื่อประเมิน',
        '- **Methods:** RCT',
        'second line of methods',
        '- **Study Design:** Randomized trial',
        '- **Clinical Relevance:** useful',
    ].join('\n'));
    assert.deepStrictEqual(sections.map(s => s.title), ['Objective', 'Methods', 'Study design', 'Clinical relevance']);
    assert.deepStrictEqual(sections[1].paragraphs, ['RCT', 'second line of methods']);
    assert.strictEqual(sections[0].paragraphs[0], 'เพื่อประเมิน');
});

test('a label without a colon is prose, not a heading', () => {
    const sections = parseSummary('Results were mixed across sites.');
    assert.deepStrictEqual(sections, [{ title: '', paragraphs: ['Results were mixed across sites.'] }]);
    assert.deepStrictEqual(parseSummary(''), []);
});

test('citations carry title and PMID only, in each format', () => {
    const post = { id: 'abcdef12-3456', title: 'A trial of X.', pmid: '123' };
    const now = new Date('2026-11-13T00:00:00Z');
    assert.strictEqual(generateCitation(post, 'vancouver', now),
        'A trial of X. PubMed PMID: 123. Available from: https://pubmed.ncbi.nlm.nih.gov/123/ [cited 13 Nov 2026].');
    assert.strictEqual(generateCitation(post, 'markdown', now), '[A trial of X](https://pubmed.ncbi.nlm.nih.gov/123/) (PMID 123)');
    assert.match(generateCitation(post, 'bibtex', now), /^@misc\{pmid123,\n {2}title = \{A trial of X\},/);
    assert.match(generateCitation(post, 'apa', now), /^A trial of X\. \(n\.d\.\)\. PubMed\. PMID 123\. Retrieved 13 Nov 2026, from /);
    assert.match(generateCitation({ ...post, pmid: '' }, 'vancouver', now), /blog\.html\?id=abcdef12-3456/);
});

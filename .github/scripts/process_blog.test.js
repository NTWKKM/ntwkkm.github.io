// Run with: node --test ".github/scripts/*.test.js"
const test = require('node:test');
const assert = require('node:assert');
const { mergeUpdates, buildPostIndex, ITEMS_PER_FILE } = require('./process_blog');
const { specialtiesOf, designOf, SPECIALTIES, DESIGNS } = require('./taxonomy');

const post = (id, pmid, extra = {}) => ({
    id, name: `Paper ${id}`, property_pmid: pmid, property_tag_1: '', property_tag_2: '', property_tag_3: '',
    property_comment: '', property_last_edited_time: '2026-01-01T00:00:00.000Z', ...extra,
});
const specIds = p => specialtiesOf(p).map(i => SPECIALTIES[i].id);
const designId = p => { const i = designOf(p); return i === -1 ? null : DESIGNS[i].id; };

test('an update replaces the record where it already lives', () => {
    const chunks = [{ number: 1, posts: [post('a', '1'), post('b', '2')] }];
    const stats = mergeUpdates(chunks, [post('a', '1', { name: 'Edited' })]);
    assert.deepStrictEqual(stats, { updated: 1, added: 0, skipped: 0 });
    assert.strictEqual(chunks[0].posts[0].name, 'Edited');
    assert.strictEqual(chunks[0].posts.length, 2);
});

test('a new Notion id with a known PMID is skipped', () => {
    const chunks = [{ number: 1, posts: [post('a', '1')] }];
    const stats = mergeUpdates(chunks, [post('z', '1')]);
    assert.strictEqual(stats.skipped, 1);
    assert.strictEqual(chunks[0].posts.length, 1);
});

test('new posts fill the last chunk, then open the next one', () => {
    const full = Array.from({ length: ITEMS_PER_FILE - 1 }, (_, i) => post(`o${i}`, String(1000 + i)));
    const chunks = [{ number: 1, posts: full }];
    mergeUpdates(chunks, [post('n1', '1'), post('n2', '2')]);
    assert.strictEqual(chunks.length, 2);
    assert.strictEqual(chunks[0].posts.length, ITEMS_PER_FILE);
    assert.deepStrictEqual(chunks[1].posts.map(p => p.id), ['n2']);
});

test('the index is newest first and records each post\'s chunk', () => {
    const chunks = [
        { number: 1, posts: [post('old', '1')] },
        { number: 2, posts: [post('new', '2', { property_last_edited_time: '2026-06-01T00:00:00.000Z' })] },
    ];
    const index = buildPostIndex(chunks);
    assert.deepStrictEqual(index.posts.map(r => [r[0], r[4]]), [['new', 2], ['old', 1]]);
});

test('specialty comes from tags, ignoring corpus-wide ones', () => {
    assert.deepStrictEqual(specIds(post('a', '1', { property_tag_1: 'Emergency Medicine', property_tag_2: 'Sepsis', property_tag_3: 'Pediatrics' })), ['infect', 'peds']);
    assert.deepStrictEqual(specIds(post('a', '1', { property_tag_1: 'Cardiac Arrest' })), ['resus']);
});

test('the title is used only when no tag maps', () => {
    assert.deepStrictEqual(specIds(post('a', '1', { name: 'Stroke thrombolysis in the ED', property_tag_1: 'Emergency' })), ['neuro']);
});

test('study design is read from the summary line', () => {
    const d = v => designId(post('a', '1', { property_comment: `- Objective: x\n- Study Design: ${v}\n- Clinical Relevance: y` }));
    assert.strictEqual(d('Retrospective cohort study'), 'cohort');
    assert.strictEqual(d('Systematic review and Meta-analysis of RCTs'), 'sr');
    assert.strictEqual(d('Randomized Controlled Trial (RCT)'), 'rct');
    assert.strictEqual(d('Retrospective case-control'), 'case-control');
    assert.strictEqual(d('Case Reports'), 'case');
    assert.strictEqual(d('N/A (Editorial/Case Report)'), null);
    assert.strictEqual(d('ไม่ระบุข้อมูลในบทคัดย่อ'), null);
    assert.strictEqual(designId(post('a', '1')), null);
});

test('the Thai study design label is read like the English one', () => {
    const p = post('a', '1', { property_comment: '- วัตถุประสงค์: x\n- รูปแบบการศึกษา: Retrospective cohort study' });
    assert.strictEqual(designId(p), 'cohort');
});

test('an unreadable listed chunk stops the run before anything is written', () => {
    const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
    const { execFileSync } = require('node:child_process');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-'));
    fs.mkdirSync(path.join(root, 'data/blog'), { recursive: true });
    fs.writeFileSync(path.join(root, 'blog_index.json'), JSON.stringify(['data/blog/research_chunk_1.json']));
    fs.writeFileSync(path.join(root, 'data/blog/research_chunk_1.json'), '[{"id": "a", ');
    assert.throws(() => execFileSync(process.execPath, [path.join(__dirname, 'process_blog.js'), '--reindex'],
        { env: { ...process.env, BLOG_ROOT_DIR: root }, stdio: 'pipe' }));
    assert.strictEqual(fs.existsSync(path.join(root, 'data/blog/index.json')), false);
    fs.rmSync(root, { recursive: true, force: true });
});

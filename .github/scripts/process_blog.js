/**
 * Blog data processor.
 *
 *   node .github/scripts/process_blog.js            merge latest_updates.json, then index
 *   node .github/scripts/process_blog.js --reindex  rebuild data/blog/index.json only
 *   node .github/scripts/process_blog.js --dedupe   drop repeated ids and PMIDs, then index
 *
 * Outputs
 *   data/blog/research_chunk_N.json  full records, at most ITEMS_PER_FILE each
 *   data/blog/index.json             one compact row per post, for the reader's list
 *   data/blog/pmids.json             every PMID held, for the homepage's summary links
 *   blog_index.json                  list of chunk paths (kept for compatibility)
 *
 * Chunks are append-only: a post stays in the chunk it was first written to and
 * new posts go to the last chunk until it is full. Only the files that really
 * changed are rewritten, so a daily run touches one chunk instead of all of them.
 * Ordering is not stored in the chunks; the reader sorts by timestamp from the index.
 */

const fs = require('fs');
const path = require('path');
const { SPECIALTIES, DESIGNS, rawTags, specialtiesOf, designOf } = require('./taxonomy');

const ITEMS_PER_FILE = 200;

const ROOT_DIR = process.env.BLOG_ROOT_DIR
    ? path.resolve(process.env.BLOG_ROOT_DIR)
    : path.join(__dirname, '../../');
const DATA_DIR = path.join(ROOT_DIR, 'data/blog');
const INDEX_FILE = path.join(ROOT_DIR, 'blog_index.json');
const POST_INDEX_FILE = path.join(DATA_DIR, 'index.json');
const PMIDS_FILE = path.join(DATA_DIR, 'pmids.json');
const UPDATES_FILE = path.join(ROOT_DIR, 'latest_updates.json');

const chunkPath = n => `data/blog/research_chunk_${n}.json`;

/** Write only when the content differs, so unchanged chunks produce no diff. */
function writeIfChanged(file, content) {
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
    fs.writeFileSync(file, content);
    return true;
}

function extractPmid(post) {
    if (post.property_pmid) {
        const pmid = String(post.property_pmid).trim();
        if (/^\d+$/.test(pmid)) return pmid;
    }
    if (post.property_pubmed) {
        const match = String(post.property_pubmed).match(/\/(\d+)\/?$/);
        if (match) return match[1];
    }
    return null;
}

/**
 * Load every chunk listed in blog_index.json as [{ number, posts }].
 * An absent manifest gives an empty start. An unreadable manifest throws, and
 * so does a listed chunk that is missing or unparseable: skipping it would
 * drop its posts from the index and let new posts reuse its slot. The throw
 * happens before anything is written, so the files on disk stay as they were.
 */
function loadChunks() {
    // No manifest yet is a valid first run. A manifest that exists but cannot
    // be read is not: treating it as empty would restart at chunk 1 and
    // overwrite real data.
    let list = [];
    if (fs.existsSync(INDEX_FILE)) {
        try {
            list = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
        } catch (e) {
            throw new Error(`Cannot read blog_index.json: ${e.message}`);
        }
        if (!Array.isArray(list)) throw new Error('blog_index.json must be a JSON array of chunk paths');
    }
    const chunks = [];
    list.forEach((rel, i) => {
        let data;
        try {
            data = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, rel), 'utf8'));
        } catch (e) {
            throw new Error(`Cannot read chunk ${rel} listed in blog_index.json: ${e.message}`);
        }
        const m = rel.match(/research_chunk_(\d+)\.json$/);
        chunks.push({
            number: m ? Number(m[1]) : i + 1,
            posts: Array.isArray(data) ? data : data.data || [],
        });
    });
    return chunks.sort((a, b) => a.number - b.number);
}

/**
 * Merge updates into the chunks in place.
 * Same Notion id: the record is replaced where it already lives.
 * New id with a known PMID: skipped as duplicate content.
 * New id: appended to the last chunk, opening a new one when it is full.
 */
function mergeUpdates(chunks, updates) {
    const where = new Map();   // id -> [chunk, position]
    const pmids = new Set();
    chunks.forEach(chunk => chunk.posts.forEach((post, pos) => {
        if (!post || !post.id) return;
        where.set(post.id, [chunk, pos]);
        const pmid = extractPmid(post);
        if (pmid) pmids.add(pmid);
    }));

    const stats = { updated: 0, added: 0, skipped: 0 };
    updates.forEach(post => {
        if (!post || !post.id) return;
        const pmid = extractPmid(post);
        const known = where.get(post.id);
        if (known) {
            // Notion only reports when a page was last edited. Carry the date
            // the paper first arrived, so an edit does not re-date or reorder it.
            const previous = known[0].posts[known[1]];
            post.first_seen = previous.first_seen || previous.property_last_edited_time || post.property_last_edited_time;
            known[0].posts[known[1]] = post;
            stats.updated++;
        } else if (pmid && pmids.has(pmid)) {
            stats.skipped++;
            return;
        } else {
            let last = chunks[chunks.length - 1];
            if (!last || last.posts.length >= ITEMS_PER_FILE) {
                last = { number: last ? last.number + 1 : 1, posts: [] };
                chunks.push(last);
            }
            post.first_seen = post.first_seen || post.property_last_edited_time;
            last.posts.push(post);
            where.set(post.id, [last, last.posts.length - 1]);
            stats.added++;
        }
        if (pmid) pmids.add(pmid);
    });
    return stats;
}

/**
 * Remove records that repeat a Notion id or a PMID already held by a newer
 * record. mergeUpdates stops new duplicates; this clears the ones written
 * before that check existed. The survivor stays in its own chunk and position
 * order, so the append-only rule still holds for every record that remains.
 * The survivor is the most recently edited copy, but the paper arrived when
 * its earliest copy did: that arrival date is carried onto the survivor as
 * first_seen, so removing a duplicate never re-dates the paper.
 * @returns {number} how many records were removed
 */
function dedupe(chunks) {
    const arrival = post => new Date(post.first_seen || post.property_last_edited_time || 0).getTime() || 0;
    const entries = [];
    chunks.forEach(chunk => chunk.posts.forEach(post => {
        if (!post || !post.id) return;
        entries.push({ post, ts: new Date(post.property_last_edited_time || 0).getTime() || 0 });
    }));
    // Newest first; Array.prototype.sort is stable, so ties keep file order.
    entries.sort((a, b) => b.ts - a.ts);

    const byId = new Map();     // id -> surviving record
    const byPmid = new Map();   // pmid -> surviving record
    const drop = new Set();
    entries.forEach(({ post }) => {
        const pmid = extractPmid(post);
        const survivor = byId.get(post.id) || (pmid && byPmid.get(pmid));
        if (survivor) {
            if (arrival(post) && (!arrival(survivor) || arrival(post) < arrival(survivor))) {
                survivor.first_seen = post.first_seen || post.property_last_edited_time;
            }
            drop.add(post);
            return;
        }
        byId.set(post.id, post);
        if (pmid) byPmid.set(pmid, post);
    });

    chunks.forEach(chunk => { chunk.posts = chunk.posts.filter(post => !drop.has(post)); });
    return drop.size;
}

/**
 * Compact list index. Each row is a fixed-position array to keep the file
 * small: [id, title, timestampMs, pmid, chunkNumber, specialtyIdx[], designIdx, tags[]]
 */
function buildPostIndex(chunks) {
    const rows = [];
    chunks.forEach(chunk => chunk.posts.forEach(post => {
        if (!post || !post.id) return;
        rows.push([
            post.id,
            String(post.name || post.property_name || '').trim(),
            new Date(post.first_seen || post.property_last_edited_time || 0).getTime() || 0,
            extractPmid(post) || '',
            chunk.number,
            specialtiesOf(post),
            designOf(post),
            rawTags(post),
        ]);
    }));
    rows.sort((a, b) => b[2] - a[2] || (a[0] < b[0] ? -1 : 1));
    return {
        version: 1,
        count: rows.length,
        fields: ['id', 'title', 'ts', 'pmid', 'chunk', 'specialties', 'design', 'tags'],
        specialties: SPECIALTIES.map(s => ({ id: s.id, label: s.label })),
        designs: DESIGNS.map(d => ({ id: d.id, label: d.label })),
        posts: rows,
    };
}

function writeAll(chunks) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    let rewritten = 0;
    chunks.forEach(chunk => {
        const file = path.join(ROOT_DIR, chunkPath(chunk.number));
        if (writeIfChanged(file, JSON.stringify(chunk.posts, null, 2))) rewritten++;
    });
    writeIfChanged(INDEX_FILE, JSON.stringify(chunks.map(c => chunkPath(c.number)), null, 2));
    const index = buildPostIndex(chunks);
    // One row per line: small on disk, and a daily diff stays a few lines long.
    const body = index.posts.map(r => JSON.stringify(r)).join(',\n');
    const head = JSON.stringify({ ...index, posts: [] }).replace(/"posts":\[\]\}$/, '"posts":[\n');
    writeIfChanged(POST_INDEX_FILE, `${head}${body}\n]}\n`);
    // The homepage only needs to know which papers have a summary here, so it
    // gets the PMIDs alone (about 16 KB) instead of the whole index.
    const pmids = index.posts.map(r => r[3]).filter(Boolean).sort();
    writeIfChanged(PMIDS_FILE, `${JSON.stringify(pmids)}\n`);
    return { rewritten, count: index.count };
}

function run() {
    const reindexOnly = process.argv.includes('--reindex');
    const chunks = loadChunks();

    if (reindexOnly) {
        const out = writeAll(chunks);
        console.log(`Reindexed ${out.count} posts from ${chunks.length} chunks.`);
        return;
    }

    if (process.argv.includes('--dedupe')) {
        const removed = dedupe(chunks);
        const out = writeAll(chunks);
        console.log(`Removed ${removed} duplicate record(s); ${out.count} posts remain, ${out.rewritten} chunk file(s) rewritten.`);
        return;
    }

    if (!fs.existsSync(UPDATES_FILE)) {
        console.log('No new updates found. Skipping process.');
        return;
    }

    let updates;
    try {
        updates = JSON.parse(fs.readFileSync(UPDATES_FILE, 'utf8'));
    } catch (e) {
        // Fail the job: a silent return would let the workflow commit nothing
        // and delete the input, losing the batch without a red run.
        console.error('Error parsing latest_updates.json:', e.message);
        process.exit(1);
    }
    if (!Array.isArray(updates)) updates = updates.data || [];

    const stats = mergeUpdates(chunks, updates);
    const out = writeAll(chunks);
    console.log(
        `Processed ${out.count} posts in ${chunks.length} chunks ` +
        `(${stats.added} added, ${stats.updated} updated, ${stats.skipped} PMID duplicates skipped, ` +
        `${out.rewritten} chunk file(s) rewritten).`
    );
}

if (require.main === module) run();

module.exports = { loadChunks, mergeUpdates, dedupe, buildPostIndex, extractPmid, ITEMS_PER_FILE };

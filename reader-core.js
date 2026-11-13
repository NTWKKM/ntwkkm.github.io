// reader-core.js - the research reader's pure logic: search scoring, search
// highlighting, summary parsing and citation text. No DOM access, so the same
// file runs in the browser (loaded before blog.js) and under `node --test`.
'use strict';

const readerCore = (() => {
    const isNode = typeof module !== 'undefined' && module.exports;
    // escapeHTML is defined once, in shared.js.
    const esc = isNode ? require('./shared.js').escapeHTML : escapeHTML;

    const tokenize = query => String(query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);

    /**
     * Score one paper against the search terms. Every term must appear as a
     * substring: a title hit counts 2, a tag/PMID/specialty hit 1, a hit found
     * only in the summary 0.
     * @param {{ titleLc: string, hay: string }} post
     * @param {string[]} tokens - lowercased terms
     * @param {string} body - lowercased summary, '' until full text has loaded
     * @returns {number} the score, or -1 when a term is missing
     */
    function scorePost(post, tokens, body = '') {
        let score = 0;
        for (const token of tokens) {
            if (post.titleLc.includes(token)) score += 2;
            else if (post.hay.includes(token)) score += 1;
            else if (!body.includes(token)) return -1;
        }
        return score;
    }

    function highlightText(text, query) {
        const terms = tokenize(query);
        if (!terms.length || !text) return esc(text);
        const pattern = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        return String(text).split(new RegExp(`(${pattern})`, 'gi'))
            .map((part, i) => (i % 2 === 1 ? `<mark class="search-highlight">${esc(part)}</mark>` : esc(part)))
            .join('');
    }

    const SECTION_RULES = [
        ['Objective', /^(?:วัตถุประสงค์|objectives?)/i],
        ['Methods', /^(?:วิธีการ[^:：]{0,30}|methods?)/i],
        ['Results', /^(?:ผลลัพธ์[^:：]{0,50}|ผลวิเคราะห์[^:：]{0,40}|สรุป[^:：]{0,30}|results?(?:\s*(?:&|and)\s*conclusions?)?|conclusions?)/i],
        ['Study design', /^(?:study design|รูปแบบการศึกษา)/i],
        ['Clinical relevance', /^(?:clinical relevance|ความสำคัญทางคลินิก)/i],
    ];

    // Escape first, then allow the one piece of markdown the summaries use.
    const inline = text => esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    /**
     * Split an AI summary into headed sections. A line is a heading only when a
     * known label is followed by a colon; any other line continues the section above.
     * @returns {{ title: string, paragraphs: string[] }[]}
     */
    function parseSummary(text) {
        const sections = [];
        String(text || '').split(/\n/).forEach((raw) => {
            const line = raw.trim().replace(/^(?:[-•]\s*|\*\s+)/, '').trim();
            if (!line) return;
            const bare = line.replace(/^\*\*\s*/, '');

            for (const [title, pattern] of SECTION_RULES) {
                const m = bare.match(new RegExp(`${pattern.source}\\s*\\**\\s*[:：]\\s*\\**\\s*`, 'i'));
                if (m && m.index === 0) {
                    sections.push({ title, paragraphs: [bare.slice(m[0].length).trim()] });
                    return;
                }
            }
            if (sections.length) sections[sections.length - 1].paragraphs.push(line);
            else sections.push({ title: '', paragraphs: [line] });
        });
        return sections;
    }

    /**
     * Only the title and PMID are stored here. Authors, journal and year are not,
     * so the citation carries none rather than inventing them.
     * @param {{ id: string, title: string, pmid: string }} post
     * @param {'vancouver'|'apa'|'bibtex'|'markdown'} format
     * @param {Date} now - the access date; a parameter so tests are repeatable
     */
    function generateCitation(post, format = 'vancouver', now = new Date()) {
        const url = post.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${post.pmid}/` : `https://ntwkkm.github.io/blog.html?id=${post.id}`;
        const title = post.title.replace(/\.$/, '');
        const accessed = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        switch (format) {
            case 'apa':
                return `${title}. (n.d.). PubMed.${post.pmid ? ` PMID ${post.pmid}.` : ''} Retrieved ${accessed}, from ${url}`;
            case 'bibtex':
                return `@misc{pmid${post.pmid || post.id.slice(0, 8)},\n  title = {${title}},\n  howpublished = {PubMed},\n  note = {${post.pmid ? `PMID: ${post.pmid}. ` : ''}Accessed: ${accessed}},\n  url = {${url}}\n}`;
            case 'markdown':
                return `[${title}](${url})${post.pmid ? ` (PMID ${post.pmid})` : ''}`;
            default:
                return `${title}. ${post.pmid ? `PubMed PMID: ${post.pmid}. ` : ''}Available from: ${url} [cited ${accessed}].`;
        }
    }

    return { tokenize, scorePost, highlightText, inline, parseSummary, generateCitation };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = readerCore;

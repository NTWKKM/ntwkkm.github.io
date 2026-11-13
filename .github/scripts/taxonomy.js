/**
 * Taxonomy for the research reader.
 *
 * The AI pipeline emits three free-form keyword tags per paper, which produced
 * more than a thousand distinct values. This module maps every paper onto two
 * small, fixed facets at build time:
 *
 *   - specialty    (multi-label, from tags first, then the title)
 *   - study design (single label, from the "Study Design:" or "รูปแบบการศึกษา:"
 *                   line of the summary)
 *
 * The raw tags stay untouched in the chunk files; only the generated index
 * carries the facets. To add or rename a category, edit the lists below and run
 * `node .github/scripts/process_blog.js --reindex`.
 */

// Order matters twice: it is the display order, and the index stores positions.
// Append new entries at the end to keep old indexes readable.
const SPECIALTIES = [
    { id: 'cardio', label: 'Cardiovascular', match: /cardio|cardiac(?! arrest)|heart|coronary|myocardial|\bacs\b|arrhythm|atrial|aort|troponin|hypertens|vascular|thrombo(?!cyt|lysis)|embolism|syncope|\becg\b|electrocardio|\bstemi\b|chest pain/ },
    { id: 'resus', label: 'Resuscitation and critical care', match: /critical care|intensive care|\bicu\b|resuscitat|cardiac arrest|\bohca\b|\bcpr\b|shock|\becmo\b|\becpr\b|vasopressor|hemodynamic|fluid therapy|critically ill|defibrillat/ },
    { id: 'airway', label: 'Airway and respiratory', match: /airway|intubat|ventilat|respirat|pulmon|\bcopd\b|asthma|pneumonia|oxygen|\bards\b|laryngoscop|pneumothorax|bronchiol/ },
    { id: 'neuro', label: 'Neurology and stroke', match: /neuro|stroke|seizure|epilep|headache|migraine|brain|intracranial|cerebr|thrombolysis|thrombectomy|delirium|dementia|vertigo|subarachnoid|concussion/ },
    { id: 'trauma', label: 'Trauma and orthopedics', match: /trauma|injur|fracture|orthop|hemorrhage|bleeding|burn|wound|\btbi\b|polytrauma|dislocation|sports medicine|musculoskeletal/ },
    { id: 'infect', label: 'Infection and sepsis', match: /infect|sepsis|septic|antibiotic|antimicrob|covid|influenza|virus|viral|bacter|microbio|vaccin|\bhiv\b|tubercul|malaria|dengue|meningitis|immunolog/ },
    { id: 'tox', label: 'Toxicology and pharmacology', match: /toxic|poison|overdose|pharmac|opioid|drug|envenom|snake|antidote|substance|alcohol|ketamine|sedat|analges|pain|anesth/ },
    { id: 'peds', label: 'Pediatrics', match: /pediatr|paediatr|child|infant|neonat|adolescen|newborn/ },
    { id: 'geri', label: 'Geriatrics', match: /geriatr|older adult|elderly|frail|aging|ageing|fall(s)?\b|palliative|end-of-life/ },
    { id: 'surg', label: 'Surgery and gastroenterology', match: /surg|gastro|abdom|laparotom|appendic|bowel|hepat|liver|pancrea|biliar|hernia|\bgi\b|urolog|renal colic|ophthalm|otolaryng|dental|dermatol/ },
    { id: 'metab', label: 'Renal, endocrine and metabolic', match: /nephro|kidney|renal(?! colic)|endocrin|diabet|metabol|electrolyte|sodium|potassium|thyroid|glucose|ketoacidosis|\bdka\b|nutrition|obesity|acid-base|dialysis/ },
    { id: 'heme', label: 'Hematology and oncology', match: /hematol|haematol|oncolog|cancer|anticoag|coagul|transfus|anemia|sickle|leukemia|lymphoma|tumou?r|neoplasm|thrombocyt/ },
    { id: 'psych', label: 'Psychiatry and behavioral health', match: /psychiat|mental health|suicid|depress|anxiety|agitat|behavio|psycholog|burnout|self-harm|violence/ },
    { id: 'obgyn', label: 'Obstetrics and gynecology', match: /obstet|gyneco|gynaeco|pregnan|maternal|ectopic|preeclampsia|postpartum|women.s health/ },
    { id: 'imaging', label: 'Imaging and diagnostics', match: /radiolog|imaging|ultrasound|\bpocus\b|sonograph|\bct\b|tomograph|\bmri\b|x-ray|diagnos|biomarker|laboratory|point-of-care|risk stratif|risk score|clinical decision rule|screening/ },
    { id: 'ai', label: 'AI and informatics', match: /artificial intelligence|\bai\b|machine learning|deep learning|language model|\bllm\b|chatgpt|informatic|digital health|telemedicine|telehealth|decision support|electronic health|algorithm|natural language/ },
    { id: 'ems', label: 'Prehospital and disaster', match: /prehospital|pre-hospital|\bems\b|emergency medical services|ambulance|paramedic|disaster|mass.casualt|helicopter|wilderness|military|out-of-hospital|heat ?stroke|drowning|environmental|altitude/ },
    { id: 'ops', label: 'ED operations and public health', match: /triage|crowding|overcrowd|length of stay|quality|patient safety|health services|public health|epidemiolog|health polic|workforce|education|simulation|training|ethic|disparit|equity|health econom|cost|guideline|administration|patient flow|boarding/ },
];

// Tags that describe the whole corpus and therefore carry no filtering value.
const GENERIC_TAG = /^(emergency( medicine| department| care| medical)?|medicine|clinical (medicine|practice|research)|research|healthcare|health care|internal medicine)$/i;

const DESIGNS = [
    { id: 'rct', label: 'Randomized trial', match: /random|\brct\b|clinical trial/ },
    { id: 'sr', label: 'Systematic review or meta-analysis', match: /systematic|meta-?analy|umbrella|scoping/ },
    { id: 'cohort', label: 'Cohort study', match: /cohort|longitudinal|registry|retrospective|prospective|observational|chart review|database/ },
    { id: 'case-control', label: 'Case-control study', match: /case[- ]control/ },
    { id: 'cross', label: 'Cross-sectional or survey', match: /cross[- ]sectional|survey|questionnaire|prevalence|descriptive/ },
    { id: 'dx', label: 'Diagnostic or prediction study', match: /diagnostic|accuracy|validation|prediction|prognostic|derivation/ },
    { id: 'case', label: 'Case report or series', match: /case (report|series|study)|case reports/ },
    { id: 'review', label: 'Review, guideline or opinion', match: /review|guideline|consensus|editorial|letter|commentary|perspective|opinion|position|statement|viewpoint/ },
    { id: 'other', label: 'Other design', match: /./ },
];

// Checked before the generic "retrospective/prospective" cohort rule so that
// "retrospective case-control" or "systematic review of RCTs" land correctly.
const DESIGN_PRIORITY = ['sr', 'case-control', 'case', 'rct', 'dx', 'cross', 'cohort', 'review', 'other'];

const NOT_STATED = /^(n\/?a\b|ไม่ระบุ|ไม่มี|not (stated|specified|reported|applicable)|unknown|-+$)/i;

// About a third of the summaries carry no "Study Design:" line. For those the
// title is consulted, with narrower patterns than the summary line gets: a
// title is prose, so only wording that names a design outright counts, and
// there is no catch-all ("other" is never guessed from a title).
const TITLE_DESIGNS = [
    ['sr', /systematic review|meta-?analys[ei]s|scoping review|umbrella review/],
    ['case-control', /case[- ]control/],
    ['case', /case reports?\b|case series/],
    ['rct', /(?<!non[- ]?)randomi[sz]ed|\brct\b/],
    ['dx', /diagnostic accuracy|external validation|prediction model|prognostic model/],
    ['cross', /cross[- ]sectional|\bsurvey\b/],
    ['cohort', /cohort|retrospective|prospective|registry/],
    ['review', /narrative review|guidelines?\b|consensus|position statement|\breview\b/],
];

function designFromTitle(post) {
    const title = String(post.name || post.property_name || '').toLowerCase();
    for (const [id, pattern] of TITLE_DESIGNS) {
        if (pattern.test(title)) return DESIGNS.findIndex(d => d.id === id);
    }
    return -1;
}

function rawTags(post) {
    return [post.property_tag_1, post.property_tag_2, post.property_tag_3]
        .map(t => (t || '').trim())
        .filter(Boolean);
}

/**
 * Specialty indexes for a post. Tags decide first; the title is consulted only
 * when no tag maps anywhere, so a well-tagged paper is never widened by a
 * passing word in its title.
 * @returns {number[]} positions in SPECIALTIES, in display order, at most 3
 */
function specialtiesOf(post) {
    const tags = rawTags(post).filter(t => !GENERIC_TAG.test(t));
    const hit = new Set();
    for (const tag of tags) {
        const text = tag.toLowerCase();
        SPECIALTIES.forEach((s, i) => { if (s.match.test(text)) hit.add(i); });
    }
    if (hit.size === 0) {
        const title = String(post.name || post.property_name || '').toLowerCase();
        SPECIALTIES.forEach((s, i) => { if (s.match.test(title)) hit.add(i); });
    }
    return Array.from(hit).sort((a, b) => a - b).slice(0, 3);
}

/**
 * Study design index for a post: from the summary line when it states one,
 * otherwise from the title, otherwise -1.
 * @returns {number} position in DESIGNS, or -1
 */
function designOf(post) {
    // Horizontal whitespace only, and the value may be empty: "\s" would cross
    // the line break of an empty "Study Design:" line and read the next section.
    const m = String(post.property_comment || '').match(/(?:Study Design|รูปแบบการศึกษา)\**[ \t]*[:：]\**[ \t]*(.*)/i);
    if (!m) return designFromTitle(post);
    const value = m[1].replace(/\*+/g, '').trim();
    if (!value || NOT_STATED.test(value)) return designFromTitle(post);
    const text = value.toLowerCase();
    for (const id of DESIGN_PRIORITY) {
        const i = DESIGNS.findIndex(d => d.id === id);
        if (DESIGNS[i].match.test(text)) return i;
    }
    return -1;
}

module.exports = { SPECIALTIES, DESIGNS, rawTags, specialtiesOf, designOf };

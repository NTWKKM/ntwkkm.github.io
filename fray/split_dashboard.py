import re

html_path = '/Users/ntwkkm/ntwkkm.github.io/fray/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Extract CSS
style_match = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
css_content = style_match.group(1).strip() if style_match else ''

# Extract JS
script_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
js_content = script_match.group(1).strip() if script_match else ''

# Add utility classes to CSS
new_css_classes = """
/* ====================================================
   EXTRACTED JS UTILITIES & MODERN PERFORMANCE
==================================================== */
.content-deferred {
    content-visibility: auto;
    contain-intrinsic-size: 1px 300px;
}
.sage-offline-text {
    margin-bottom: 16px; font-size: 1.05rem; font-weight: 500; line-height: 1.7; color: var(--text-muted); font-style: italic;
}
.sage-header {
    display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
}
.sage-metrics {
    margin-top: 10px; font-size: 0.85rem; color: var(--text-muted);
}
.active-components-box {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 12px; margin-bottom: 12px; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; overflow-x: auto; white-space: nowrap;
}
.alerts-box {
    background: var(--state-err-bg); border: 1px solid var(--state-err-border); border-radius: var(--radius-sm); padding: 8px 12px;
}
.outsider-quote-text {
    margin-bottom: 16px; font-size: 1.05rem; font-weight: 500; line-height: 1.7; color: var(--text-main);
}
.outsider-insight-box {
    margin-top: 16px; padding-top: 12px; border-top: 1px dashed var(--border); font-size: 0.9rem; color: var(--text-secondary);
}
.outsider-meta {
    display:block;text-align:right;font-size:0.75rem;color:var(--text-faint);margin-top:10px;
}
.chip-scale {
    margin-left: 4px; transform: scale(0.85); transform-origin: left center;
}
.text-warn { color: var(--state-warn); }
.text-err { color: var(--state-err); }
.text-muted { color: var(--text-muted); }
.text-main { color: var(--text-main); }
.text-secondary { color: var(--text-secondary); }
.mb-1 { margin-bottom: 4px; }
.mb-2 { margin-bottom: 8px; }
.mt-1 { margin-top: 4px; }
"""

css_content += "\n" + new_css_classes

# Write CSS
with open('/Users/ntwkkm/ntwkkm.github.io/fray/fray-dashboard.css', 'w', encoding='utf-8') as f:
    f.write(css_content)

# Replace JS inline styles with classes
js_content = js_content.replace(
    '<div style="margin-bottom: 16px; font-size: 1.05rem; font-weight: 500; line-height: 1.7; color: var(--text-muted); font-style: italic;">',
    '<div class="sage-offline-text">'
).replace(
    '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">',
    '<div class="sage-header">'
).replace(
    '<div style="margin-top: 10px; font-size: 0.85rem; color: var(--text-muted);">',
    '<div class="sage-metrics">'
).replace(
    '<div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 12px; margin-bottom: 12px; font-family: \'JetBrains Mono\', monospace; font-size: 0.75rem; overflow-x: auto; white-space: nowrap;">',
    '<div class="active-components-box">'
).replace(
    '<div style="background: var(--state-err-bg); border: 1px solid var(--state-err-border); border-radius: var(--radius-sm); padding: 8px 12px;">',
    '<div class="alerts-box">'
).replace(
    '<div style="margin-bottom: 16px; font-size: 1.05rem; font-weight: 500; line-height: 1.7; color: var(--text-main);">',
    '<div class="outsider-quote-text">'
).replace(
    '<div style="margin-top: 16px; padding-top: 12px; border-top: 1px dashed var(--border); font-size: 0.9rem; color: var(--text-secondary);">',
    '<div class="outsider-insight-box">'
).replace(
    '<div style="display:block;text-align:right;font-size:0.75rem;color:var(--text-faint);margin-top:10px;">',
    '<div class="outsider-meta">'
).replace(
    'style="margin-bottom: 0;"',
    'class="mb-0"'
).replace(
    'style="margin-bottom: 8px;"',
    'class="mb-2"'
).replace(
    'style="margin-bottom: 6px; font-size: 0.9rem; color: var(--text-secondary);"',
    'class="mb-1 text-secondary text-base"'
).replace(
    'style="margin-bottom: 4px; color: var(--text-main);"',
    'class="mb-1 text-main"'
).replace(
    'style="margin-left: 4px; transform: scale(0.85); transform-origin: left center;"',
    'class="chip-scale"'
)

# Replace JS html string concatenation with modern templates
# Wait, for the JS refactor, I will just do standard string replacements for the inline styles first,
# this immediately solves the main "inline styles in JS" problem and is much safer than rewriting the whole JS logic.

with open('/Users/ntwkkm/ntwkkm.github.io/fray/fray-dashboard.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

# Update HTML file
html_new = re.sub(r'<style>.*?</style>', '<link rel="stylesheet" href="fray-dashboard.css">', html, flags=re.DOTALL)
html_new = re.sub(r'<script>\s*// ============================================================\s*// HELPERS.*?updateDashboard\(\);\s*</script>', '<script src="fray-dashboard.js"></script>', html_new, flags=re.DOTALL)

# Add content-deferred to the lower panels
html_new = html_new.replace('class="panel span-2 fade-up d3"', 'class="panel span-2 fade-up d3 content-deferred"')
html_new = html_new.replace('class="audit-table-wrapper fade-up d4"', 'class="audit-table-wrapper fade-up d4 content-deferred"')

with open('/Users/ntwkkm/ntwkkm.github.io/fray/index.html', 'w', encoding='utf-8') as f:
    f.write(html_new)

print("Files split and updated successfully.")

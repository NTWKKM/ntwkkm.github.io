const fs = require('fs');
const path = require('path');

// Constants
const README_PATH = path.join(__dirname, '../../README.md');
const REPO_ROOT = path.join(__dirname, '../../');
const START_MARKER = '[--- REPOSITORY-TREE-START ---]';
const END_MARKER = '[--- REPOSITORY-TREE-END ---]';
const START_REGEX = '\\\\[--- REPOSITORY-TREE-START ---\\\\]|\\[--- REPOSITORY-TREE-START ---\\]';
const END_REGEX = '\\\\[--- REPOSITORY-TREE-END ---\\\\]|\\[--- REPOSITORY-TREE-END ---\\]';

// Ignore directories/files
const IGNORE_LIST = ['.git', '.github', 'node_modules', '.tempmediaStorage', '.gemini'];

function buildTree(dir, prefix = '') {
    let treeStr = '';
    let files;
    try {
        files = fs.readdirSync(dir);
    } catch (e) {
        return treeStr;
    }

    files = files.filter(f => !IGNORE_LIST.includes(f));
    files.sort((a, b) => {
        const aIsDir = fs.statSync(path.join(dir, a)).isDirectory();
        const bIsDir = fs.statSync(path.join(dir, b)).isDirectory();
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
    });

    files.forEach((file, index) => {
        const isLast = index === files.length - 1;
        const pointer = isLast ? '`-- ' : '|-- ';
        
        const fullPath = path.join(dir, file);
        const isDir = fs.statSync(fullPath).isDirectory();
        
        if (isDir) {
            treeStr += `${prefix}${pointer}${file} /\n`;
            treeStr += buildTree(fullPath, prefix + (isLast ? '    ' : '|   '));
        } else {
            treeStr += `${prefix}${pointer}${file}\n`;
        }
    });

    return treeStr;
}

try {
    console.log('Generating repository tree...');
    const treeString = buildTree(REPO_ROOT);
    
    const newContent = `
📂 Repository Contents (File Structure)

This content reflects the repository structure (updated by GitHub Actions):

\`\`\`text
${treeString.trim()}
\`\`\`
`;

    console.log('Reading README.md...');
    let readme = fs.readFileSync(README_PATH, 'utf8');
    
    const regex = /\\?\[--- REPOSITORY-TREE-START ---\\?\][\s\S]*?\\?\[--- REPOSITORY-TREE-END ---\\?\]/;
    
    if (readme.match(regex)) {
        readme = readme.replace(
            regex,
            `${START_MARKER}\n${newContent}\n${END_MARKER}`
        );
        fs.writeFileSync(README_PATH, readme, 'utf8');
        console.log('README.md updated successfully.');
    } else {
        console.log('Could not find markers in README.md.');
    }
} catch (error) {
    console.error('Error generating README:', error);
    process.exit(1);
}

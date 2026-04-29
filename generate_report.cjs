const fs = require('fs');
const path = require('path');

const projectDir = '/Users/paranjay/droprun';
const outputFile = path.join(projectDir, 'project_report.md');

let report = `# DropRun - Project Report\n\n`;

const extensions = ['.ts', '.tsx', '.css', '.sql', '.html', '.md'];
const excludeDirs = ['node_modules', 'dist', '.git'];

function walkDir(dir) {
    const files = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!excludeDirs.includes(path.basename(file))) {
                files.push(...walkDir(file));
            }
        } else {
            if (extensions.includes(path.extname(file)) && path.basename(file) !== 'project_report.md') {
                files.push(file);
            }
        }
    });
    return files;
}

const allFiles = walkDir(projectDir);

report += `## Project Files\n\n`;

for (const file of allFiles) {
    report += `### ${path.relative(projectDir, file)}\n\n`;
    report += '```\\n';
    report += fs.readFileSync(file, 'utf-8');
    report += '\\n```\\n\\n';
}

fs.writeFileSync(outputFile, report);
console.log('Markdown report generated at', outputFile);

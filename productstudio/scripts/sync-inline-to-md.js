#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const inlinePath = path.resolve(__dirname, '../src/data/projects-inline.js');
const mdPath = path.resolve(__dirname, '../src/data/projects.md');

if (!fs.existsSync(inlinePath)) {
  console.error('Inline file not found:', inlinePath);
  process.exit(1);
}

const content = fs.readFileSync(inlinePath, 'utf8');

// extract the template string assigned to window.PROJECTS_MD
const m = content.match(/window\.PROJECTS_MD\s*=\s*`([\s\S]*)`\s*;/);
if (!m) {
  console.error('Could not extract PROJECTS_MD from', inlinePath);
  process.exit(1);
}

const md = m[1];

// backup existing md file
if (fs.existsSync(mdPath)) {
  const backup = mdPath + '.' + Date.now() + '.bak';
  fs.copyFileSync(mdPath, backup);
  console.log('Backed up', mdPath, 'to', backup);
}

fs.writeFileSync(mdPath, md, 'utf8');
console.log('Wrote', mdPath, 'from', inlinePath);

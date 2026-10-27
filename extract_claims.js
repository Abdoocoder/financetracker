const fs = require('fs');
const path = require('path');

const projectRoot = '/home/abdullah/Projects/financetracker';
const docPath = path.join(projectRoot, 'ARCHITECTURE.md');
const content = fs.readFileSync(docPath, 'utf-8');

const lines = content.split('\n');
let claims = [];

let inCodeBlock = false;
let codeBlockLang = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  
  if (line.trim().startsWith('```')) {
    if (!inCodeBlock) {
      inCodeBlock = true;
      codeBlockLang = line.trim().slice(3).trim();
    } else {
      inCodeBlock = false;
      codeBlockLang = '';
    }
    continue;
  }
  
  const isInExampleCodeBlock = inCodeBlock && ['diff', 'example', 'template'].includes(codeBlockLang);
  const isInBashCodeBlock = inCodeBlock && ['bash', 'sh', 'shell'].includes(codeBlockLang);
  
  if (line.includes('<!-- VERIFY:')) continue;
  
  // 1. File path claims
  const filePathRegex = /`([a-zA-Z0-9_./-]+\.(ts|js|cjs|mjs|md|json|yaml|yml|toml|txt|sh|py|go|rs|java|rb|css|html|tsx|jsx))`/g;
  let match;
  while ((match = filePathRegex.exec(line)) !== null) {
    const claim = match[1];
    if (claim.includes('your-') || claim.includes('<name>') || claim.includes('{') || claim.includes('example') || claim.includes('sample') || claim.includes('placeholder') || claim.includes('my-')) continue;
    const prefix = line.substring(0, match.index).trim().toLowerCase();
    if (prefix.endsWith('e.g.') || prefix.endsWith('example:') || prefix.endsWith('for instance') || prefix.endsWith('such as') || prefix.endsWith('like:')) continue;
    claims.push({ line: lineNum, category: 'file', claim, context: line.trim() });
  }
  
  // 2. Command claims - inline
  if (!isInExampleCodeBlock) {
    const cmdRegex = /`(npm|yarn|pnpm|npx|node|git)\s+[^`]+`/g;
    while ((match = cmdRegex.exec(line)) !== null) {
      const claim = match[1];
      const prefix = line.substring(0, match.index).trim().toLowerCase();
      if (prefix.endsWith('e.g.') || prefix.endsWith('example:') || prefix.endsWith('for instance') || prefix.endsWith('such as') || prefix.endsWith('like:')) continue;
      claims.push({ line: lineNum, category: 'command', claim: match[0], context: line.trim() });
    }
  }
  
  // 2b. Command claims in bash code blocks
  if (isInBashCodeBlock) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      claims.push({ line: lineNum, category: 'command', claim: trimmed, context: line.trim() });
    }
  }
  
  // 3. API endpoint claims
  const apiRegex = /(GET|POST|PUT|DELETE|PATCH)\s+\/[a-zA-Z0-9/_:-]+/g;
  while ((match = apiRegex.exec(line)) !== null) {
    const claim = match[0];
    const prefix = line.substring(0, match.index).trim().toLowerCase();
    if (prefix.endsWith('e.g.') || prefix.endsWith('example:') || prefix.endsWith('for instance') || prefix.endsWith('such as') || prefix.endsWith('like:')) continue;
    claims.push({ line: lineNum, category: 'api', claim, context: line.trim() });
  }
  
  // 4. Function/export claims
  const funcRegex = /`([a-zA-Z_][a-zA-Z0-9_]*)\(/g;
  while ((match = funcRegex.exec(line)) !== null) {
    const claim = match[1];
    const prefix = line.substring(0, match.index).trim().toLowerCase();
    if (prefix.endsWith('e.g.') || prefix.endsWith('example:') || prefix.endsWith('for instance') || prefix.endsWith('such as') || prefix.endsWith('like:')) continue;
    claims.push({ line: lineNum, category: 'function', claim, context: line.trim() });
  }
  
  // 5. Dependency claims
  const depKeywords = ['uses', 'requires', 'depends on', 'powered by', 'built with'];
  const depRegex = /`([a-zA-Z0-9@/_-]+)`/g;
  while ((match = depRegex.exec(line)) !== null) {
    const claim = match[1];
    const prefix = line.substring(0, match.index).trim().toLowerCase();
    if (prefix.endsWith('e.g.') || prefix.endsWith('example:') || prefix.endsWith('for instance') || prefix.endsWith('such as') || prefix.endsWith('like:')) continue;
    const contextLower = line.toLowerCase();
    const hasDepKeyword = depKeywords.some(kw => contextLower.includes(kw));
    if (hasDepKeyword && !claim.includes('.') && !claim.includes('/')) {
      claims.push({ line: lineNum, category: 'dependency', claim, context: line.trim() });
    }
  }
}

console.log('Total claims extracted:', claims.length);
console.log(JSON.stringify(claims, null, 2));
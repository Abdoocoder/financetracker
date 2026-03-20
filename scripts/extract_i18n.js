const fs = require('fs');
const path = require('path');

const fileContent = fs.readFileSync(path.join(__dirname, '..', 'lib', 'i18n.tsx'), 'utf8');

// Use regex to locate translations object
const arStart = fileContent.indexOf('ar: {');
const enStart = fileContent.indexOf('en: {');
const endOfEn = fileContent.indexOf('} as const');

if (arStart === -1 || enStart === -1 || endOfEn === -1) {
  console.error("Could not find start or end tokens");
  process.exit(1);
}

// Extract string portions
let arStr = fileContent.substring(arStart + 4, enStart).trim();
arStr = arStr.substring(0, arStr.length - 1).trim(); // Remove trailing comma

let enStr = fileContent.substring(enStart + 4, endOfEn).trim();
enStr = enStr.substring(0, enStr.length - 1).trim(); // Remove trailing comma

// Convert JS object literals to pure JSON by using eval in a sandbox
function safeEval(str) {
  str = str.replace(/,\s*}/g, '}'); // Remove trailing commas from last item
  return new Function(`return (${str})`)();
}

const arDict = safeEval(arStr);
const enDict = safeEval(enStr);

const assetsDir = path.join(__dirname, '..', 'mobile', 'fajrak_flutter', 'assets', 'i18n');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

fs.writeFileSync(path.join(assetsDir, 'ar.json'), JSON.stringify(arDict, null, 2), 'utf8');
fs.writeFileSync(path.join(assetsDir, 'en.json'), JSON.stringify(enDict, null, 2), 'utf8');

console.log("Extraction complete!");

const fs = require('fs');
const path = require('path');

// Manual ZIP creation - just copy an existing image multiple times with different names
// to create a "test" ZIP structure

const sourceImage = path.join(__dirname, 'apps/web/public/images/leaf_hero.png');

// Check if source exists
if (!fs.existsSync(sourceImage)) {
  console.error('Source image not found:', sourceImage);
  process.exit(1);
}

// Create temp directory structure
const testDir = path.join(__dirname, 'temp-zip-test');
const subfolder1 = path.join(testDir, 'subfolder1');
const subfolder2 = path.join(testDir, 'subfolder2');

fs.mkdirSync(subfolder1, { recursive: true });
fs.mkdirSync(subfolder2, { recursive: true });

// Copy image to different locations
const imageBuffer = fs.readFileSync(sourceImage);
console.log(`Source image size: ${imageBuffer.length} bytes`);

const files = [
  { path: path.join(testDir, 'V-12345678.jpg'), desc: 'root level variant' },
  { path: path.join(testDir, 'P-87654321.jpg'), desc: 'root level product' },
  { path: path.join(testDir, 'CG-11223344.jpg'), desc: 'root level category' },
  { path: path.join(subfolder1, 'V-55667788.jpg'), desc: 'subfolder1 variant' },
  { path: path.join(subfolder2, 'V-99887766.jpg'), desc: 'subfolder2 variant' },
];

files.forEach(({ path: filePath, desc }) => {
  fs.writeFileSync(filePath, imageBuffer);
  console.log(`Created: ${desc} -> ${filePath}`);
});

console.log(`\nTest directory created: ${testDir}`);
console.log('Now you can manually zip this directory and test it.');
console.log('Files are ready at:', files.map(f => f.path).join('\n  '));

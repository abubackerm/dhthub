const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Create a test ZIP file with images in subfolders
const zip = new AdmZip();

// Use an existing PNG file from the project
const sourceImage = path.join(__dirname, 'apps/web/public/images/leaf_hero.png');

// Copy source image to temp locations for different SKUs
const tempDir = path.join(__dirname, 'temp-test-images');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Create subfolders
const subfolder1 = path.join(tempDir, 'subfolder1');
const subfolder2 = path.join(tempDir, 'subfolder2');
fs.mkdirSync(subfolder1, { recursive: true });
fs.mkdirSync(subfolder2, { recursive: true });

// Copy images to different locations
const images = [
  { source: sourceImage, dest: path.join(tempDir, 'V-12345678.jpg') },
  { source: sourceImage, dest: path.join(tempDir, 'P-87654321.jpg') },
  { source: sourceImage, dest: path.join(tempDir, 'CG-11223344.jpg') },
  { source: sourceImage, dest: path.join(subfolder1, 'V-55667788.jpg') },
  { source: sourceImage, dest: path.join(subfolder2, 'V-99887766.jpg') },
];

images.forEach(({ source, dest }) => {
  fs.copyFileSync(source, dest);
  console.log(`Created: ${path.relative(tempDir, dest)}`);
});

// Add files to ZIP
zip.addLocalFolder(tempDir, '');

// Write ZIP
const zipPath = path.join(__dirname, 'test-images-with-subfolders.zip');
zip.writeZip(zipPath);

console.log(`\nTest ZIP created: ${zipPath}`);
console.log('ZIP structure:');
console.log('  - V-12345678.jpg (root level variant)');
console.log('  - P-87654321.jpg (root level product)');
console.log('  - CG-11223344.jpg (root level category)');
console.log('  - subfolder1/V-55667788.jpg (subfolder variant)');
console.log('  - subfolder2/V-99887766.jpg (subfolder variant)');

// Clean up temp directory
fs.rmSync(tempDir, { recursive: true, force: true });

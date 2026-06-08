const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

// Create a test ZIP file with images in subfolders
const output = fs.createWriteStream(path.join(__dirname, 'test-images-with-subfolders.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Test ZIP created: ${archive.pointer()} total bytes`);
  console.log('ZIP structure:');
  console.log('  - images/P-12345678.jpg (root level image)');
  console.log('  - V-12345678.jpg (root level variant image)');
  console.log('  - CG-12345678.jpg (root level category image)');
  console.log('  - subfolder/V-87654321.jpg (subfolder image)');
  console.log('  - another-folder/V-11223344.jpg (subfolder image)');
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Create dummy image content (1x1 red pixel in PNG format)
const dummyPng = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
  0x0C, 0x49, 0x44, 0x41, 0x54, 0x28, 0x15, 0x63, 0x60, 0x18, 0x05, 0x00,
  0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00,
  0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
]);

// Add images to root level
archive.append(dummyPng, { name: 'P-12345678.jpg' });
archive.append(dummyPng, { name: 'V-12345678.jpg' });
archive.append(dummyPng, { name: 'CG-12345678.jpg' });

// Add images to subfolder
archive.append(dummyPng, { name: 'subfolder/V-87654321.jpg' });

// Add images to another subfolder
archive.append(dummyPng, { name: 'another-folder/V-11223344.jpg' });

archive.finalize();

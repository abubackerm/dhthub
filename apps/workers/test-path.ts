import * as path from 'path';

// Simulate what happens in the controller
const fileUrl = '/uploads/import/imports/2026/03/1773564128698-catalog-import-templates(1).zip';
const relativePath = fileUrl.replace(/^\/uploads\/import\//, '');

console.log('Original fileUrl:', fileUrl);
console.log('Relative path:', relativePath);

// Simulate process.cwd() being apps/api
const cwd = 'd:\\Projects\\Tekhive\\dynamic_hub\\apps\\api';
const filePath = path.join(cwd, 'uploads', 'import', relativePath);

console.log('Expected file path:', filePath);

// Check if file exists
const fs = require('fs');
console.log('File exists?', fs.existsSync(filePath));

// List what's actually in the directory
const uploadDir = path.join(cwd, 'uploads', 'import', 'imports', '2026', '03');
console.log('\nFiles in upload directory:');
if (fs.existsSync(uploadDir)) {
  const files = fs.readdirSync(uploadDir);
  files.forEach(file => console.log('  -', file));
} else {
  console.log('  Directory does not exist:', uploadDir);
}

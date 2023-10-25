const { readFileSync, writeFileSync, existsSync } = require('fs');
const path = require('path');

function getFilename (filePath) {
  return path.resolve(__dirname, '..', ...filePath);
}

function read (filePath) {
  return readFileSync(getFilename(filePath), 'utf-8');
}

function write (filePath, content) {
  return writeFileSync(getFilename(filePath), content);
}

function exists (filePath) {
  return existsSync(getFilename(filePath));
}

module.exports = {
  read,
  write,
  exists
};

const fs = require('fs').promises;

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function readFileWithSize(file) {
  const fileStat = await fs.stat(file);
  const buffer = await fs.readFile(file);
  return {
    size: fileStat.size,
    buffer,
  };
}

module.exports = {
  exists,
  readFileWithSize,
};

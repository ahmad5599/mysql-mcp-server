const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const JSON5 = require('json5');

function getMcpConfigPath() {
  const home = os.homedir();
  return process.platform === 'win32'
    ? path.join(home, 'AppData', 'Roaming', 'Code', 'User', 'mcp.json')
    : path.join(home, '.config', 'Code', 'User', 'mcp.json');
}

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    try {
      return JSON.parse(raw);
    } catch (error) {
      return JSON5.parse(raw);
    }
  } catch (error) {
    return {};
  }
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
  getMcpConfigPath,
  readJson,
  writeJson,
};

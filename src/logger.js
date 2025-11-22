const fs = require('fs').promises;
const path = require('path');

function createLogger(config) {
  const { loggers = [], logPath } = config;

  const write = async (level, message) => {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

    if (loggers.includes('stderr')) {
      const stream = level === 'error' ? process.stderr : process.stdout;
      stream.write(`${entry}\n`);
    }

    if (loggers.includes('disk')) {
      try {
        await fs.mkdir(logPath, { recursive: true });
        await fs.appendFile(path.join(logPath, 'mysql-mcp.log'), `${entry}\n`);
      } catch (error) {
        process.stderr.write(`Failed to write disk log: ${error.message}\n`);
      }
    }

    if (loggers.includes('mcp')) {
      process.stderr.write(`MCP_LOG: ${entry}\n`);
    }
  };

  return {
    info: (msg) => write('info', msg),
    warn: (msg) => write('warn', msg),
    error: (msg) => write('error', msg),
    debug: (msg) => write('debug', msg),
  };
}

module.exports = { createLogger };

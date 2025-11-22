const path = require('path');
const dotenv = require('dotenv');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

dotenv.config();

const defaultLogPath = path.join(
  process.env.HOME || process.env.USERPROFILE || process.cwd(),
  '.mysql-mcp',
  '.app-logs'
);

function loadConfig() {
  const argv = yargs(hideBin(process.argv))
    .option('connectionString', {
      type: 'string',
      description: 'Database connection string (mysql://, postgres://, sqlite://)',
      default: process.env.MYSQL_MCP_CONNECTION_STRING || '',
    })
    .option('readOnly', {
      type: 'boolean',
      description: 'Restrict to read-only operations',
      default: process.env.MYSQL_MCP_READ_ONLY === 'true',
    })
    .option('transport', {
      type: 'string',
      description: 'Transport mode: stdio or http',
      choices: ['stdio', 'http'],
      default: process.env.MYSQL_MCP_TRANSPORT || 'stdio',
    })
    .option('httpHost', {
      type: 'string',
      description: 'HTTP host to bind',
      default: process.env.MYSQL_MCP_HTTP_HOST || '127.0.0.1',
    })
    .option('httpPort', {
      type: 'number',
      description: 'HTTP port to bind',
      default: parseInt(process.env.MYSQL_MCP_HTTP_PORT || '3000', 10),
    })
    .option('loggers', {
      type: 'string',
      description: 'Comma-separated loggers (mcp, disk, stderr)',
      default: process.env.MYSQL_MCP_LOGGERS || 'disk,mcp',
    })
    .option('logPath', {
      type: 'string',
      description: 'Path for disk logs',
      default: process.env.MYSQL_MCP_LOG_PATH || defaultLogPath,
    })
    .option('maxRowsPerQuery', {
      type: 'number',
      description: 'Max rows per query',
      default: parseInt(process.env.MYSQL_MCP_MAX_ROWS_PER_QUERY || '100', 10),
    })
    .option('telemetry', {
      type: 'string',
      description: 'Enable/disable telemetry',
      choices: ['enabled', 'disabled'],
      default: process.env.MYSQL_MCP_TELEMETRY || 'enabled',
    })
    .help(false)
    .version(false)
    .parse();

  const loggers = argv.loggers
    .split(',')
    .map(logger => logger.trim())
    .filter(Boolean);

  return {
    connectionString: argv.connectionString,
    readOnly: Boolean(argv.readOnly),
    transport: argv.transport,
    httpHost: argv.httpHost,
    httpPort: argv.httpPort,
    loggers,
    logPath: argv.logPath,
    maxRowsPerQuery: argv.maxRowsPerQuery,
    telemetry: argv.telemetry !== 'disabled' && process.env.DO_NOT_TRACK !== '1',
  };
}

module.exports = { loadConfig };

#!/usr/bin/env node

const mysql = require('mysql2/promise');
const { Client: PgClient } = require('pg');
const format = require('pg-format');
const sqlite3 = require('sqlite3').verbose();
const yargs = require('yargs');
const dotenv = require('dotenv');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');

// Load environment variables
dotenv.config();

// CLI arguments
const argv = yargs
  .option('connectionString', {
    type: 'string',
    description: 'Database connection string (e.g., mysql://, postgres://, sqlite://)',
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
    default: parseInt(process.env.MYSQL_MCP_HTTP_PORT) || 3000,
  })
  .option('loggers', {
    type: 'string',
    description: 'Comma-separated loggers (mcp, disk, stderr)',
    default: process.env.MYSQL_MCP_LOGGERS || 'disk,mcp',
  })
  .option('logPath', {
    type: 'string',
    description: 'Path for disk logs',
    default: process.env.MYSQL_MCP_LOG_PATH || path.join(process.env.HOME || process.env.USERPROFILE, '.mysql-mcp', '.app-logs'),
  })
  .option('maxRowsPerQuery', {
    type: 'number',
    description: 'Max rows per query',
    default: parseInt(process.env.MYSQL_MCP_MAX_ROWS_PER_QUERY) || 100,
  })
  .option('telemetry', {
    type: 'string',
    description: 'Enable/disable telemetry',
    default: process.env.MYSQL_MCP_TELEMETRY || 'enabled',
  })
  .help().argv;

// Logger setup
const loggers = argv.loggers.split(',').map(l => l.trim());
const log = async (message, level = 'info') => {
  const logMessage = `[${new Date().toISOString()}] ${level.toUpperCase()}: ${message}\n`;
  if (loggers.includes('stderr')) console.error(logMessage);
  if (loggers.includes('disk')) {
    await fs.mkdir(argv.logPath, { recursive: true });
    await fs.appendFile(path.join(argv.logPath, 'mysql-mcp.log'), logMessage);
  }
  if (loggers.includes('mcp')) {
    console.log(`MCP_LOG: ${logMessage}`);
  }
};

// MCP Server state
let connection = null;
let dbType = null;
const config = {
  connectionString: argv.connectionString,
  readOnly: argv.readOnly,
  maxRowsPerQuery: argv.maxRowsPerQuery,
  telemetry: argv.telemetry !== 'disabled' && process.env.DO_NOT_TRACK !== '1',
};

// Parse connection string to determine DB type
const parseConnectionString = (connectionString) => {
  const parsed = url.parse(connectionString);
  const protocol = parsed.protocol ? parsed.protocol.replace(':', '') : '';
  return { protocol, parsed };
};

// Sanitize table and column names for SQLite
const sanitizeIdentifier = (name) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid identifier: ${name}`);
  }
  return name;
};

// Connect to the database
const connectToDatabase = async (connectionString) => {
  const { protocol, parsed } = parseConnectionString(connectionString);
  if (protocol === 'mysql') {
    return await mysql.createConnection(connectionString);
  } else if (protocol === 'postgres') {
    const client = new PgClient({ connectionString });
    await client.connect();
    return client;
  } else if (protocol === 'sqlite') {
    const dbPath = parsed.pathname;
    return new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
  } else {
    throw new Error(`Unsupported protocol: ${protocol}`);
  }
};

// Normalize query results
const normalizeResults = (rows, dbType) => {
  if (dbType === 'mysql') return Array.isArray(rows) ? rows : [];
  if (dbType === 'postgres') return Array.isArray(rows) ? rows : [];
  if (dbType === 'sqlite') return Array.isArray(rows) ? rows : [];
  return Array.isArray(rows) ? rows : [];
};

// Execute query (with DB-specific handling)
const executeQuery = async (query, params, limit, dbType) => {
  if (dbType === 'mysql') {
    // MySQL's SHOW TABLES and DESCRIBE don't support LIMIT; INSERT doesn't return rows
    if (query.toLowerCase().startsWith('show tables') || query.toLowerCase().startsWith('describe')) {
      const [rows] = await connection.query(query, params);
      return rows.slice(0, limit);
    } else if (query.toLowerCase().startsWith('insert')) {
      const [result] = await connection.query(query, params);
      return result; // Return metadata (e.g., affectedRows) without slicing
    }
    const [rows] = await connection.query(`${query} LIMIT ?`, [...params, limit]);
    return rows;
  } else if (dbType === 'postgres') {
    const result = await connection.query(query, params);
    return result.rows.slice(0, limit);
  } else if (dbType === 'sqlite') {
    return new Promise((resolve, reject) => {
      connection.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.slice(0, limit));
      });
    });
  }
  throw new Error('Unsupported database type');
};

// MCP Tools
const tools = [
  {
    name: 'connect',
    description: 'Connect to a SQL database (MySQL, PostgreSQL, SQLite)',
    operationType: 'connect',
    parameters: [
      { name: 'connectionString', type: 'string', description: 'Database connection string (e.g., mysql://, postgres://, sqlite://)' },
    ],
    async execute({ connectionString }) {
      try {
        const { protocol } = parseConnectionString(connectionString);
        if (!['mysql', 'postgres', 'sqlite'].includes(protocol)) {
          throw new Error(`Unsupported protocol: ${protocol}`);
        }
        connection = await connectToDatabase(connectionString);
        dbType = protocol;
        config.connectionString = connectionString;
        await log(`Connected to ${protocol} database`);
        return { status: 'success', message: `Connected to ${protocol}` };
      } catch (error) {
        await log(`Connection failed: ${error.message}`, 'error');
        throw new Error(`Failed to connect: ${error.message}`);
      }
    },
  },
  {
    name: 'query',
    description: 'Run a SQL SELECT query (read-only)',
    operationType: 'read',
    parameters: [
      { name: 'query', type: 'string', description: 'SQL SELECT query' },
      { name: 'limit', type: 'number', description: 'Max rows to return', default: config.maxRowsPerQuery },
    ],
    async execute({ query, limit = config.maxRowsPerQuery }) {
      if (!connection) throw new Error('Not connected to a database');
      if (!query.toLowerCase().startsWith('select')) {
        throw new Error('Only SELECT queries are allowed');
      }
      try {
        const rows = await executeQuery(query, [], limit, dbType);
        await log(`Executed query: ${query}`);
        return normalizeResults(rows, dbType);
      } catch (error) {
        await log(`Query failed: ${error.message}`, 'error');
        throw new Error(`Query failed: ${error.message}`);
      }
    },
  },
  {
    name: 'list-tables',
    description: 'List all tables in the current database',
    operationType: 'metadata',
    parameters: [],
    async execute() {
      if (!connection) throw new Error('Not connected to a database');
      try {
        let query;
        if (dbType === 'mysql') query = 'SHOW TABLES';
        else if (dbType === 'postgres') query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'";
        else if (dbType === 'sqlite') query = "SELECT name FROM sqlite_master WHERE type='table'";
        const rows = await executeQuery(query, [], config.maxRowsPerQuery, dbType);
        const normalizedRows = normalizeResults(rows, dbType);
        const tables = Array.isArray(normalizedRows) ? normalizedRows.map(row => Object.values(row)[0]) : [];
        await log('Listed tables');
        return tables;
      } catch (error) {
        await log(`List tables failed: ${error.message}`, 'error');
        throw new Error(`List tables failed: ${error.message}`);
      }
    },
  },
  {
    name: 'schema-describe',
    description: 'Describe the schema of a table',
    operationType: 'metadata',
    parameters: [
      { name: 'table', type: 'string', description: 'Table name' },
    ],
    async execute({ table }) {
      if (!connection) throw new Error('Not connected to a database');
      try {
        let query, params;
        if (dbType === 'mysql') {
          query = 'DESCRIBE ??';
          params = [table];
        } else if (dbType === 'postgres') {
          query = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1";
          params = [table];
        } else if (dbType === 'sqlite') {
          query = `PRAGMA table_info(${sanitizeIdentifier(table)})`;
          params = [];
        }
        const rows = await executeQuery(query, params, config.maxRowsPerQuery, dbType);
        await log(`Described schema for table: ${table}`);
        return normalizeResults(rows, dbType);
      } catch (error) {
        await log(`Schema describe failed: ${error.message}`, 'error');
        throw new Error(`Schema describe failed: ${error.message}`);
      }
    },
  },
  {
    name: 'insert',
    description: 'Insert a row into a table',
    operationType: 'create',
    parameters: [
      { name: 'table', type: 'string', description: 'Table name' },
      { name: 'data', type: 'object', description: 'Data to insert' },
    ],
    async execute({ table, data }) {
      if (config.readOnly) throw new Error('Insert disabled in read-only mode');
      if (!connection) throw new Error('Not connected to a database');
      try {
        const keys = Object.keys(data);
        const values = Object.values(data);
        let query, params;
        if (dbType === 'postgres') {
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          query = format('INSERT INTO %I (%I) VALUES (%s)', table, keys, placeholders);
          params = values;
        } else if (dbType === 'sqlite') {
          const sanitizedTable = sanitizeIdentifier(table);
          const sanitizedKeys = keys.map(sanitizeIdentifier);
          const placeholders = keys.map(() => '?').join(', ');
          query = `INSERT INTO ${sanitizedTable} (${sanitizedKeys.join(', ')}) VALUES (${placeholders})`;
          params = values;
        } else {
          const placeholders = keys.map(() => '?').join(', ');
          query = `INSERT INTO ?? (${keys.map(() => '??').join(', ')}) VALUES (${placeholders})`;
          params = [table, ...keys, ...values];
        }
        await executeQuery(query, params, 1, dbType);
        await log(`Inserted into table: ${table}`);
        return { status: 'success', message: `Inserted into ${table}` };
      } catch (error) {
        await log(`Insert failed: ${error.message}`, 'error');
        throw new Error(`Insert failed: ${error.message}`);
      }
    },
  },
];

// MCP Resources
const resources = [
  {
    name: 'config',
    uri: 'config://config',
    description: 'Server configuration (redacted sensitive data)',
    async get() {
      return {
        connectionString: config.connectionString ? '[REDACTED]' : '',
        readOnly: config.readOnly,
        maxRowsPerQuery: config.maxRowsPerQuery,
        telemetry: config.telemetry,
        dbType,
      };
    },
  },
  {
    name: 'debug',
    uri: 'debug://sql',
    description: 'Debugging information for SQL connectivity',
    async get() {
      return {
        lastConnectionAttempt: config.connectionString ? { connectionString: '[REDACTED]', timestamp: new Date().toISOString() } : null,
        status: connection ? 'connected' : 'disconnected',
        dbType,
      };
    },
  },
];

// MCP Server
const startServer = async () => {
  await log('Starting SQL MCP Server');
  // Auto-connect if connection string is provided
  if (config.connectionString) {
    try {
      const { protocol } = parseConnectionString(config.connectionString);
      if (!['mysql', 'postgres', 'sqlite'].includes(protocol)) {
        throw new Error(`Unsupported protocol: ${protocol}`);
      }
      connection = await connectToDatabase(config.connectionString);
      dbType = protocol;
      await log(`Auto-connected to ${protocol} database`);
    } catch (error) {
      await log(`Auto-connection failed: ${error.message}`, 'error');
      // Continue running server even if auto-connect fails
    }
  }

  if (argv.transport === 'http') {
    const app = express();
    app.use(express.json());
    app.post('/mcp', async (req, res) => {
      const { tool, parameters } = req.body;
      const selectedTool = tools.find(t => t.name === tool);
      if (!selectedTool) {
        await log(`Unknown tool: ${tool}`, 'error');
        return res.status(400).json({ error: 'Unknown tool' });
      }
      if (selectedTool.operationType !== 'read' && selectedTool.operationType !== 'metadata' && selectedTool.operationType !== 'connect' && config.readOnly) {
        await log(`Tool ${tool} blocked in read-only mode`, 'error');
        return res.status(403).json({ error: 'Operation disabled in read-only mode' });
      }
      try {
        const result = await selectedTool.execute(parameters);
        res.json({ result });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    app.get('/mcp/resources', async (req, res) => {
      const resource = resources.find(r => r.uri === req.query.uri);
      if (!resource) return res.status(400).json({ error: 'Unknown resource' });
      try {
        const data = await resource.get();
        res.json({ result: data });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    app.listen(argv.httpPort, argv.httpHost, () => {
      log(`HTTP server running on http://${argv.httpHost}:${argv.httpPort}`);
    });
  } else {
    process.stdin.on('data', async data => {
      try {
        const { tool, parameters } = JSON.parse(data.toString());
        const selectedTool = tools.find(t => t.name === tool);
        if (!selectedTool) {
          await log(`Unknown tool: ${tool}`, 'error');
          process.stdout.write(JSON.stringify({ error: 'Unknown tool' }) + '\n');
          return;
        }
        if (selectedTool.operationType !== 'read' && selectedTool.operationType !== 'metadata' && selectedTool.operationType !== 'connect' && config.readOnly) {
          await log(`Tool ${tool} blocked in read-only mode`, 'error');
          process.stdout.write(JSON.stringify({ error: 'Operation disabled in read-only mode' }) + '\n');
          return;
        }
        const result = await selectedTool.execute(parameters);
        process.stdout.write(JSON.stringify({ result }) + '\n');
      } catch (error) {
        await log(`Error processing request: ${error.message}`, 'error');
        process.stdout.write(JSON.stringify({ error: error.message }) + '\n');
      }
    });
  }
  const registeredTools = tools.filter(t => !config.readOnly || ['read', 'metadata', 'connect'].includes(t.operationType));
  await log(`Registered tools: ${registeredTools.map(t => t.name).join(', ')}`);
};

// Start the server
startServer().catch(async err => {
  await log(`Server failed to start: ${err.message}`, 'error');
  process.exit(1);
});
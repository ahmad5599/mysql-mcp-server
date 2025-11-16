#!/usr/bin/env node

/**
 * MariaDB MCP Server
 * A Model Context Protocol server for MariaDB/MySQL databases
 */

const mysql = require('mysql2/promise');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

// Configuration from environment variables
const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASS || process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DB || process.env.MYSQL_DATABASE || '',
};

let connection = null;

// Initialize database connection
async function initDB() {
  try {
    connection = await mysql.createConnection(config);
    console.error(`✓ Connected to MariaDB at ${config.host}:${config.port}, database: ${config.database}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to connect to MariaDB: ${error.message}`);
    console.error(`  Host: ${config.host}:${config.port}`);
    console.error(`  User: ${config.user}`);
    console.error(`  Database: ${config.database}`);
    throw error;
  }
}

// Create MCP server
const server = new Server(
  {
    name: 'mariadb-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'query',
        description: 'Execute a SQL query and return results',
        inputSchema: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'The SQL query to execute',
            },
          },
          required: ['sql'],
        },
      },
      {
        name: 'list_tables',
        description: 'List all tables in the current database',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'describe_table',
        description: 'Get the schema/structure of a specific table',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'The name of the table to describe',
            },
          },
          required: ['table'],
        },
      },
      {
        name: 'list_databases',
        description: 'List all databases on the server',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!connection) {
      await initDB();
    }

    switch (name) {
      case 'query': {
        const [rows] = await connection.execute(args.sql);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(rows, null, 2),
            },
          ],
        };
      }

      case 'list_tables': {
        const [rows] = await connection.execute('SHOW TABLES');
        const tables = rows.map(row => Object.values(row)[0]);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tables, null, 2),
            },
          ],
        };
      }

      case 'describe_table': {
        const [rows] = await connection.execute(`DESCRIBE ${args.table}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(rows, null, 2),
            },
          ],
        };
      }

      case 'list_databases': {
        const [rows] = await connection.execute('SHOW DATABASES');
        const databases = rows.map(row => Object.values(row)[0]);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(databases, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  try {
    // Initialize database connection
    await initDB();

    // Create stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('MariaDB MCP Server running on stdio');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', async () => {
  if (connection) {
    await connection.end();
  }
  process.exit(0);
});

main();
function buildTools({ connectionManager, config, logger }) {
  const defaultLimit = config.maxRowsPerQuery;

  return [
    {
      name: 'connect',
      description: 'Connect to a SQL database (MySQL, PostgreSQL, SQLite)',
      operationType: 'connect',
      inputSchema: {
        type: 'object',
        properties: {
          connectionString: {
            type: 'string',
            description: 'Database connection string (mysql://, postgres://, sqlite://)',
          },
        },
        required: ['connectionString'],
      },
      handler: async ({ connectionString }) => {
        if (!connectionString) {
          throw new Error('connectionString is required');
        }
        const result = await connectionManager.connect(connectionString);
        await logger.info(`Tool connect executed for ${result.dbType}`);
        return { status: 'success', dbType: result.dbType };
      },
    },
    {
      name: 'query',
      description: 'Run a SQL SELECT query (read-only)',
      operationType: 'read',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SQL SELECT query to execute',
          },
          limit: {
            type: 'number',
            description: 'Max rows to return',
            default: defaultLimit,
          },
        },
        required: ['query'],
      },
      handler: async ({ query, limit = defaultLimit }) => {
        if (!query) {
          throw new Error('query is required');
        }
        if (!query.trim().toLowerCase().startsWith('select')) {
          throw new Error('Only SELECT queries are allowed');
        }
        const rows = await connectionManager.runSelect(query, limit);
        await logger.info(`Query executed (${rows.length} rows)`);
        return rows;
      },
    },
    {
      name: 'list-tables',
      description: 'List tables in the connected database',
      operationType: 'metadata',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const tables = await connectionManager.listTables();
        await logger.info('Listed tables');
        return tables;
      },
    },
    {
      name: 'schema-describe',
      description: 'Describe the schema of a table',
      operationType: 'metadata',
      inputSchema: {
        type: 'object',
        properties: {
          table: {
            type: 'string',
            description: 'Table name to inspect',
          },
        },
        required: ['table'],
      },
      handler: async ({ table }) => {
        if (!table) {
          throw new Error('table is required');
        }
        const schema = await connectionManager.describeTable(table);
        await logger.info(`Schema described for ${table}`);
        return schema;
      },
    },
    {
      name: 'insert',
      description: 'Insert a row into a table (disabled when read-only)',
      operationType: 'create',
      inputSchema: {
        type: 'object',
        properties: {
          table: {
            type: 'string',
            description: 'Target table',
          },
          data: {
            type: 'object',
            description: 'Key/value pairs to insert',
          },
        },
        required: ['table', 'data'],
      },
      handler: async ({ table, data }) => {
        if (config.readOnly) {
          throw new Error('Insert disabled in read-only mode');
        }
        if (!table || !data) {
          throw new Error('table and data are required');
        }
        await connectionManager.insert(table, data);
        await logger.info(`Inserted data into ${table}`);
        return { status: 'success', table };
      },
    },
  ];
}

module.exports = { buildTools };

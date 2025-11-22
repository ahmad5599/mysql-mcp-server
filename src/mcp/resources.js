function buildResources({ connectionManager, config }) {
  return [
    {
      name: 'config',
      uri: 'config://config',
      description: 'Server configuration (redacted)',
      get: async () => ({
        connectionString: connectionManager.getConnectionString() ? '[REDACTED]' : '',
        readOnly: config.readOnly,
        maxRowsPerQuery: config.maxRowsPerQuery,
        telemetry: config.telemetry,
        dbType: connectionManager.getDbType(),
      }),
    },
    {
      name: 'debug',
      uri: 'debug://sql',
      description: 'Debugging information for SQL connectivity',
      get: async () => ({
        status: connectionManager.getStatus(),
        timestamp: new Date().toISOString(),
      }),
    },
  ];
}

module.exports = { buildResources };

const { getDriverFactory } = require('../drivers');

class ConnectionManager {
  constructor(config, logger) {
    this.logger = logger;
    this.driver = null;
    this.dbType = null;
    this.connectionString = config.connectionString || '';
    this.maxRowsPerQuery = config.maxRowsPerQuery || 100;
  }

  async connect(connectionString) {
    const { DriverCtor, protocol } = getDriverFactory(connectionString);
    await this.disconnect();

    this.driver = new DriverCtor({
      connectionString,
      logger: this.logger,
      maxRowsPerQuery: this.maxRowsPerQuery,
    });

    await this.driver.connect();
    this.dbType = protocol;
    this.connectionString = connectionString;
    await this.logger.info(`Connected to ${protocol} database via driver ${this.driver.name}`);
    return { dbType: this.dbType };
  }

  async disconnect() {
    if (this.driver) {
      await this.driver.disconnect();
      this.driver = null;
      this.dbType = null;
      await this.logger.info('Database connection closed');
    }
  }

  async ensureConnection() {
    if (!this.driver && this.connectionString) {
      try {
        await this.connect(this.connectionString);
      } catch (error) {
        await this.logger.error(`Auto-connection failed: ${error.message}`);
        throw error;
      }
    }
    if (!this.driver) {
      throw new Error('Not connected to a database');
    }
  }

  isConnected() {
    return Boolean(this.driver);
  }

  getDbType() {
    return this.dbType;
  }

  getConnectionString() {
    return this.connectionString;
  }

  getStatus() {
    return {
      connected: this.isConnected(),
      dbType: this.dbType,
      connectionString: this.connectionString,
      driver: this.driver ? this.driver.name : null,
    };
  }

  async runSelect(query, limit = this.maxRowsPerQuery) {
    await this.ensureConnection();
    return this.driver.runSelect(query, limit);
  }

  async listTables() {
    await this.ensureConnection();
    return this.driver.listTables();
  }

  async describeTable(table) {
    await this.ensureConnection();
    return this.driver.describeTable(table);
  }

  async insert(table, data) {
    await this.ensureConnection();
    return this.driver.insert(table, data);
  }
}

module.exports = { ConnectionManager };

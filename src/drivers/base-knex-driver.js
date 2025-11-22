const knex = require('knex');

class BaseKnexDriver {
  constructor({ connectionString, logger, maxRowsPerQuery }) {
    this.connectionString = connectionString;
    this.logger = logger;
    this.maxRowsPerQuery = maxRowsPerQuery || 100;
    this.knexInstance = null;
  }

  get name() {
    return 'sql';
  }

  get protocol() {
    return 'sql';
  }

  async connect() {
    if (this.knexInstance) {
      return;
    }
    const config = await this.buildKnexConfig();
    this.knexInstance = knex(config);
    await this.logger.info(`Driver ${this.name} connected`);
  }

  async disconnect() {
    if (this.knexInstance) {
      await this.knexInstance.destroy();
      this.knexInstance = null;
      await this.logger.info(`Driver ${this.name} disconnected`);
    }
  }

  buildKnexConfig() {
    return {
      client: 'sqlite3',
      connection: this.connectionString,
      useNullAsDefault: true,
    };
  }

  knex() {
    if (!this.knexInstance) {
      throw new Error('Driver is not connected');
    }
    return this.knexInstance;
  }

  normalizeRows(rawResult) {
    if (Array.isArray(rawResult)) {
      return Array.isArray(rawResult[0]) ? rawResult[0] : rawResult;
    }
    if (rawResult && Array.isArray(rawResult.rows)) {
      return rawResult.rows;
    }
    return rawResult || [];
  }

  ensureLimitClause(sql, limit) {
    const trimmed = sql.trim().replace(/;+$/, '');
    if (/limit\s+\d+$/i.test(trimmed)) {
      return trimmed;
    }
    return `${trimmed} LIMIT ${limit}`;
  }

  async runSelect(query, limit = this.maxRowsPerQuery) {
    const limited = this.ensureLimitClause(query, limit);
    const raw = await this.knex().raw(limited);
    const rows = this.normalizeRows(raw);
    return Array.isArray(rows) ? rows.slice(0, limit) : rows;
  }

  async listTables() {
    throw new Error('listTables not implemented');
  }

  async describeTable() {
    throw new Error('describeTable not implemented');
  }

  async insert(table, data) {
    const db = this.knex();
    await db(table).insert(data);
    return { status: 'success' };
  }

  getStatus() {
    return {
      driver: this.name,
      protocol: this.protocol,
    };
  }
}

module.exports = { BaseKnexDriver };

const path = require('path');
const { URL } = require('url');
const { BaseKnexDriver } = require('./base-knex-driver');
const { sanitizeIdentifier } = require('../db/utils');

class SqliteDriver extends BaseKnexDriver {
  constructor(options) {
    super(options);
    this.clientName = 'sqlite3';
  }

  get name() {
    return 'sqlite';
  }

  get protocol() {
    return 'sqlite';
  }

  buildKnexConfig() {
    const parsed = new URL(this.connectionString);
    const filename = parsed.pathname
      ? path.resolve(parsed.pathname)
      : path.resolve(process.cwd(), 'sqlite.db');
    return {
      client: this.clientName,
      connection: {
        filename,
      },
      useNullAsDefault: true,
    };
  }

  async listTables() {
    const raw = await this.knex().raw("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    const rows = this.normalizeRows(raw);
    return rows.map((row) => row.name);
  }

  async describeTable(table) {
    const safeTable = sanitizeIdentifier(table);
    const raw = await this.knex().raw(`PRAGMA table_info(${safeTable})`);
    return this.normalizeRows(raw);
  }
}

module.exports = { SqliteDriver };

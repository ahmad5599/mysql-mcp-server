const { BaseKnexDriver } = require('./base-knex-driver');

class MysqlDriver extends BaseKnexDriver {
  constructor(options) {
    super(options);
    this.clientName = 'mysql2';
  }

  get name() {
    return 'mysql';
  }

  get protocol() {
    return 'mysql';
  }

  buildKnexConfig() {
    return {
      client: this.clientName,
      connection: this.connectionString,
    };
  }

  async listTables() {
    const raw = await this.knex().raw('SHOW TABLES');
    const rows = this.normalizeRows(raw);
    return rows.map((row) => Object.values(row)[0]);
  }

  async describeTable(table) {
    const raw = await this.knex().raw('DESCRIBE ??', [table]);
    return this.normalizeRows(raw);
  }
}

module.exports = { MysqlDriver };

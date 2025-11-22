const { BaseKnexDriver } = require('./base-knex-driver');

class PostgresDriver extends BaseKnexDriver {
  constructor(options) {
    super(options);
    this.clientName = 'pg';
  }

  get name() {
    return 'postgres';
  }

  get protocol() {
    return 'postgres';
  }

  buildKnexConfig() {
    return {
      client: this.clientName,
      connection: this.connectionString,
    };
  }

  async listTables() {
    const query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name";
    const raw = await this.knex().raw(query);
    const rows = this.normalizeRows(raw);
    return rows.map((row) => row.table_name);
  }

  async describeTable(table) {
    const query = "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ? ORDER BY ordinal_position";
    const raw = await this.knex().raw(query, [table]);
    return this.normalizeRows(raw);
  }
}

module.exports = { PostgresDriver };

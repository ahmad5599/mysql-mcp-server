const { MysqlDriver } = require('./mysql-driver');
const { PostgresDriver } = require('./postgres-driver');
const { SqliteDriver } = require('./sqlite-driver');
const { URL } = require('url');

const DRIVER_BY_PROTOCOL = {
  mysql: MysqlDriver,
  postgres: PostgresDriver,
  sqlite: SqliteDriver,
};

function parseProtocol(connectionString) {
  try {
    const parsed = new URL(connectionString);
    return (parsed.protocol || '').replace(':', '');
  } catch (error) {
    throw new Error(`Invalid connection string: ${error.message}`);
  }
}

function getDriverFactory(connectionString) {
  const protocol = parseProtocol(connectionString);
  const DriverCtor = DRIVER_BY_PROTOCOL[protocol];
  if (!DriverCtor) {
    throw new Error(`Unsupported protocol: ${protocol}`);
  }
  return { DriverCtor, protocol };
}

function getRegisteredDrivers() {
  return Object.keys(DRIVER_BY_PROTOCOL);
}

module.exports = { getDriverFactory, getRegisteredDrivers };

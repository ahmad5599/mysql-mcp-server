const DRIVER_OPTIONS = [
  { label: 'SQLite', value: 'sqlite', connectionHint: 'sqlite:///absolute/path/to/file.db' },
  { label: 'MySQL / MariaDB', value: 'mysql', connectionHint: 'mysql://user:password@host:3306/database' },
  { label: 'PostgreSQL', value: 'postgres', connectionHint: 'postgres://user:password@host:5432/database' },
];

const SERVER_ID_PREFIX = 'ahmad/sql-gateway';

module.exports = {
  DRIVER_OPTIONS,
  SERVER_ID_PREFIX,
};

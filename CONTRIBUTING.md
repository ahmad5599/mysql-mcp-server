# Contributing to SQL MCP Server

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Adding a New Database Driver](#adding-a-new-database-driver)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Maintain a professional and friendly environment

## Getting Started

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR-USERNAME/mysql-mcp-server.git
   cd mysql-mcp-server
   ```

2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clear, concise commit messages
   - Follow the existing code style
   - Add tests for new features

4. **Test your changes**
   ```bash
   npm test
   ```

5. **Submit a pull request**

## Development Setup

### Prerequisites

- Node.js ≥ 20.19.0
- Git
- One or more test databases (MySQL, PostgreSQL, SQLite)

### Installation

```bash
# Install dependencies
npm install

# Install extension dependencies
cd extension
npm install
cd ..

# Run tests
npm test
```

### Running in Development Mode

```bash
# Start server with SQLite (for testing)
MYSQL_MCP_CONNECTION_STRING="sqlite://$(pwd)/test.db" node server.js

# Start in HTTP mode for easier debugging
node server.js --transport http --httpPort 4000
```

## Project Structure

```
mysql-mcp-server/
├── server.js                 # Entry point
├── src/
│   ├── config.js            # Configuration management
│   ├── logger.js            # Logging system
│   ├── server.js            # MCP server implementation
│   ├── db/
│   │   ├── connection-manager.js  # Connection lifecycle
│   │   └── utils.js               # DB utilities
│   ├── drivers/
│   │   ├── base-knex-driver.js   # Base driver class
│   │   ├── mysql-driver.js       # MySQL/MariaDB driver
│   │   ├── postgres-driver.js    # PostgreSQL driver
│   │   ├── sqlite-driver.js      # SQLite driver
│   │   └── index.js              # Driver registry
│   └── mcp/
│       ├── tools.js         # MCP tool definitions
│       └── resources.js     # MCP resource definitions
├── extension/
│   ├── extension.js         # VS Code extension entry
│   ├── package.json         # Extension manifest
│   └── src/
│       ├── constants.js     # Shared constants
│       ├── utils.js         # File system utilities
│       └── server-manager.js  # Server process manager
├── scripts/
│   ├── integration-sqlite.js   # SQLite integration test
│   └── test-mariadb.js         # MariaDB integration test
└── test.db                  # Sample SQLite database
```

## Adding a New Database Driver

### Step 1: Create Driver Class

Create a new file `src/drivers/yourdb-driver.js`:

```javascript
const BaseKnexDriver = require('./base-knex-driver');

class YourDbDriver extends BaseKnexDriver {
  constructor(connectionString) {
    super(connectionString);
  }

  buildKnexConfig() {
    return {
      client: 'your-knex-client',  // e.g., 'mssql', 'oracledb'
      connection: this.connectionString,
      // Add any driver-specific options
    };
  }

  async listTables() {
    // Implement database-specific table listing
    // Example for SQL Server:
    const rows = await this.knex.raw(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);
    return rows.map(row => row.TABLE_NAME);
  }

  async describeTable(tableName) {
    // Implement database-specific schema introspection
    // Example for SQL Server:
    const rows = await this.knex.raw(`
      SELECT 
        COLUMN_NAME as Field,
        DATA_TYPE as Type,
        IS_NULLABLE as \`Null\`,
        COLUMN_DEFAULT as \`Default\`
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = ?
    `, [tableName]);
    return rows;
  }
}

module.exports = YourDbDriver;
```

### Step 2: Register Driver

Add your driver to `src/drivers/index.js`:

```javascript
const YourDbDriver = require('./yourdb-driver');

const DRIVER_BY_PROTOCOL = {
  mysql: MysqlDriver,
  postgres: PostgresDriver,
  sqlite: SqliteDriver,
  yourdb: YourDbDriver,  // Add your driver
};
```

### Step 3: Add Extension Support

Update `extension/src/constants.js`:

```javascript
const DRIVER_OPTIONS = [
  { label: 'SQLite', value: 'sqlite', connectionHint: 'sqlite:///...' },
  { label: 'MySQL', value: 'mysql', connectionHint: 'mysql://...' },
  { label: 'PostgreSQL', value: 'postgres', connectionHint: 'postgres://...' },
  { label: 'Your Database', value: 'yourdb', connectionHint: 'yourdb://...' },
];
```

### Step 4: Add Tests

Create `scripts/test-yourdb.js`:

```javascript
#!/usr/bin/env node

const { spawn } = require('child_process');
const http = require('http');

const TEST_CONFIG = {
  connectionString: 'yourdb://user:pass@localhost/db',
  httpPort: 4022,
};

// ... implement test similar to test-mariadb.js
```

### Step 5: Update Documentation

1. Add driver to README.md prerequisites
2. Document connection string format
3. Add any driver-specific configuration
4. Update CHANGELOG.md

### Step 6: Install Database Client

```bash
npm install your-database-client --save
```

For example:
- SQL Server: `npm install mssql tedious`
- Oracle: `npm install oracledb`

### Step 7: Submit PR

1. Ensure all tests pass
2. Add driver-specific tests
3. Update documentation
4. Create pull request with description

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific driver test
node scripts/integration-sqlite.js
node scripts/test-mariadb.js
```

### Writing Tests

Tests should cover:
- Connection establishment
- Table listing
- Schema description
- Query execution
- Error handling

Example test structure:

```javascript
async function runTests() {
  try {
    await startServer();
    
    // Test 1: Connect
    const connectResult = await mcpRequest('connect', {
      connectionString: TEST_CONFIG.connectionString
    });
    assert(connectResult.status === 'success');
    
    // Test 2: List tables
    const tables = await mcpRequest('list-tables');
    assert(Array.isArray(tables.result));
    
    // Test 3: Describe table
    const schema = await mcpRequest('schema-describe', {
      table: tables.result[0]
    });
    assert(Array.isArray(schema.result));
    
    // Test 4: Query
    const rows = await mcpRequest('query', {
      query: `SELECT * FROM ${tables.result[0]} LIMIT 5`
    });
    assert(Array.isArray(rows.result));
    
    console.log('✅ All tests passed');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    stopServer();
  }
}
```

## Submitting Changes

### Commit Messages

Use clear, descriptive commit messages:

```
feat: Add SQL Server driver support
fix: Handle null values in schema description
docs: Update connection string examples
test: Add PostgreSQL integration tests
```

Prefixes:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Tests
- `refactor:` Code refactoring
- `chore:` Maintenance

### Pull Request Process

1. **Update documentation**
   - README.md for user-facing changes
   - CHANGELOG.md for notable changes
   - Code comments for complex logic

2. **Ensure tests pass**
   ```bash
   npm test
   ```

3. **Update package version** (for maintainers)
   - Follow semantic versioning
   - Update package.json and extension/package.json

4. **Create PR**
   - Clear title describing the change
   - Detailed description
   - Link related issues
   - Add screenshots for UI changes

5. **Code review**
   - Address reviewer feedback
   - Keep PR scope focused
   - Update as needed

## Coding Standards

### JavaScript Style

- Use ES6+ features
- Prefer `const` over `let`
- Use async/await over callbacks
- Handle errors properly
- Add JSDoc comments for public APIs

```javascript
/**
 * Execute a SELECT query with automatic row limit
 * @param {string} query - SQL SELECT statement
 * @param {number} limit - Maximum rows to return
 * @returns {Promise<Array>} Query results
 */
async function runSelect(query, limit) {
  // Implementation
}
```

### File Organization

- One class per file
- Group related functionality
- Keep files under 300 lines when possible
- Use descriptive file names

### Error Handling

```javascript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  await logger.error(`Operation failed: ${error.message}`);
  throw new Error(`Failed to complete operation: ${error.message}`);
}
```

### Logging

Use appropriate log levels:

```javascript
await logger.info('Connection established');
await logger.warn('Using deprecated API');
await logger.error('Connection failed', { error });
await logger.debug('Raw query', { sql });
```

## Questions?

- 💬 Open a [GitHub Discussion](https://github.com/ahmad5599/mysql-mcp-server/discussions)
- 🐛 Report bugs via [GitHub Issues](https://github.com/ahmad5599/mysql-mcp-server/issues)
- 📧 Email: ahmad5599@example.com

Thank you for contributing! 🎉

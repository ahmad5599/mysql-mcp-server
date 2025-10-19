MySQL MCP Server
A Model Context Protocol (MCP) server for interacting with SQL databases (MySQL, PostgreSQL, SQLite) in VS Code, Cursor, and other MCP-compatible clients. Enables AI agents to connect, query, and manage SQL databases using natural language.
Prerequisites

Node.js (v20.19.0+)
A SQL database (MySQL, PostgreSQL, or SQLite) with a valid connection string
VS Code or Cursor for the extension

Installation
As a VS Code Extension

Install from the VS Code Marketplace (TBD after publishing).
Run the Configure MySQL MCP Server command to set your connection string.

As a Standalone Server
npm install -g mysql-mcp-server@latest
export MYSQL_MCP_CONNECTION_STRING="mysql://user:pass@localhost:3306/db"
mysql-mcp-server --readOnly

Using Docker
docker run --rm -i \
  -e MYSQL_MCP_CONNECTION_STRING="mysql://user:pass@localhost:3306/db" \
  mysql-mcp-server:latest

Configuration
Use environment variables for sensitive data (recommended):
export MYSQL_MCP_CONNECTION_STRING="mysql://user:pass@localhost:3306/db"
export MYSQL_MCP_READ_ONLY=true
mysql-mcp-server

Supported databases:

MySQL: mysql://user:pass@host:port/db
PostgreSQL: postgres://user:pass@host:port/db
SQLite: sqlite:///path/to/db.sqlite

Tools

connect: Connect to a SQL database
query: Run a SELECT query (read-only)
list-tables: List tables in the current database
schema-describe: Describe a table's schema
insert: Insert a row (disabled in read-only mode)

Security

Read-Only Mode: Enabled by default (--readOnly or MYSQL_MCP_READ_ONLY=true).
Prepared Statements: Used to prevent SQL injection.
Environment Variables: Recommended for sensitive data.

Contributing
See CONTRIBUTING.md for details.
License
MIT
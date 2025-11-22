# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-23

### Added
- Initial release of SQL MCP Server
- Model Context Protocol (MCP) SDK v1.18.2 integration
- Multi-database support (MySQL/MariaDB, PostgreSQL, SQLite)
- Driver abstraction layer with pluggable architecture
- VS Code extension with interactive configuration wizard
- Profile management system for multiple database connections
- Five MCP tools: `connect`, `query`, `list-tables`, `schema-describe`, `insert`
- Read-only mode by default for security
- Prepared statements and identifier sanitization
- Multi-channel logging (stderr, disk, MCP console)
- STDIO and HTTP transport modes
- Docker containerization support
- Comprehensive integration tests for SQLite and MariaDB
- Production-ready documentation

### Security
- Read-only mode enabled by default
- All queries use prepared statements
- Table and column name sanitization
- Automatic LIMIT clause enforcement on SELECT queries
- Connection string isolation per profile

### Documentation
- Complete README with installation and usage instructions
- Troubleshooting guide
- Security best practices
- Docker deployment examples
- Architecture diagrams
- Contributing guidelines

## [Unreleased]

### Planned
- Microsoft SQL Server driver support
- Oracle Database driver support
- Query result caching
- Connection pooling optimization
- Web-based management UI
- GraphQL-style query interface
- Multi-tenancy support
- Automated GitHub Actions CI/CD
- VS Code Marketplace publishing

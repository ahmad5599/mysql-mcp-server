#!/usr/bin/env node

const { startServer } = require('./src/server');

startServer().catch((error) => {
  console.error(`Server failed to start: ${error.message}`);
  process.exit(1);
});
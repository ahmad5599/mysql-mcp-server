#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const serverEntry = path.join(__dirname, '..', 'server.js');
const dbPath = path.join(__dirname, '..', 'test.db');
const port = 4020;

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const connectionString = `sqlite://${dbPath}`;
  const child = spawn(
    'node',
    [
      serverEntry,
      '--transport',
      'http',
      '--httpPort',
      String(port),
      '--connectionString',
      connectionString,
      '--readOnly',
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    }
  );

  const logs = [];
  const readyPattern = /HTTP server listening/;
  let isReady = false;

  const handleData = (chunk) => {
    const text = chunk.toString();
    logs.push(text);
    if (readyPattern.test(text)) {
      isReady = true;
    }
  };

  child.stdout.on('data', handleData);
  child.stderr.on('data', handleData);

  child.on('exit', (code) => {
    if (!isReady) {
      console.error('Server exited before it was ready. Logs:\n', logs.join(''));
      process.exit(code || 1);
    }
  });

  // Wait up to 5 seconds for readiness
  const start = Date.now();
  while (!isReady && Date.now() - start < 5000) {
    await wait(100);
  }

  if (!isReady) {
    child.kill();
    console.error('Timed out waiting for HTTP server to start. Logs:\n', logs.join(''));
    process.exit(1);
  }

  const baseUrl = `http://127.0.0.1:${port}`;
  const listTablesResponse = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool: 'list-tables' }),
  });
  const listTables = await listTablesResponse.json();
  if (!Array.isArray(listTables.result) || listTables.result.length === 0) {
    child.kill();
    console.error('Expected list-tables to return at least one table. Response:', listTables);
    process.exit(1);
  }

  const firstTable = listTables.result[0];
  const describeResponse = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tool: 'schema-describe',
      parameters: { table: firstTable },
    }),
  });
  const describe = await describeResponse.json();
  if (!Array.isArray(describe.result) || describe.result.length === 0) {
    child.kill();
    console.error('Expected schema-describe to return column metadata. Response:', describe);
    process.exit(1);
  }

  child.kill();
  console.log('Integration test passed. Tables:', listTables.result.join(', '));
}

main().catch((error) => {
  console.error('Integration test failed:', error);
  process.exit(1);
});

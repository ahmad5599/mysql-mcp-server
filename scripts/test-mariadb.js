#!/usr/bin/env node
/**
 * Integration test for MariaDB driver
 * Tests connection to existing 'nest' database
 */

const { spawn } = require('child_process');
const http = require('http');

const TEST_CONFIG = {
  connectionString: 'mysql://root:1234@localhost:3306/nest',
  httpPort: 4021,
  testTable: 'users' // Assuming this exists in nest database
};

let serverProcess = null;

/**
 * Start the MCP server in HTTP mode for testing
 */
function startServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting MCP server with MariaDB connection...');
    
    serverProcess = spawn('node', ['server.js', '--transport', 'http', '--httpPort', String(TEST_CONFIG.httpPort)], {
      cwd: __dirname + '/..',
      env: {
        ...process.env,
        MYSQL_MCP_CONNECTION_STRING: TEST_CONFIG.connectionString,
        MYSQL_MCP_READ_ONLY: 'true'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';

    serverProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(`[server] ${text}`);
      
      if (text.includes('HTTP server listening')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(`[server error] ${text}`);
      
      // Check stderr for server ready message too
      if (text.includes('HTTP server listening')) {
        resolve();
      }
    });

    serverProcess.on('error', reject);
    
    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    setTimeout(() => {
      if (!output.includes('HTTP server listening')) {
        reject(new Error('Server did not start within timeout'));
      }
    }, 5000);
  });
}

/**
 * Stop the server
 */
function stopServer() {
  if (serverProcess) {
    console.log('🛑 Stopping server...');
    serverProcess.kill();
    serverProcess = null;
  }
}

/**
 * Make HTTP request to MCP server
 */
function mcpRequest(tool, parameters = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ tool, parameters });
    
    const options = {
      hostname: 'localhost',
      port: TEST_CONFIG.httpPort,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result);
        } catch (err) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 MariaDB Driver Integration Test');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Start server
    await startServer();
    console.log('✅ Server started successfully\n');

    // Wait a bit for server to be fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 1: List tables
    console.log('📋 Test 1: List tables in nest database');
    const tablesResult = await mcpRequest('list-tables');
    console.log('Response:', JSON.stringify(tablesResult, null, 2));
    
    const tables = tablesResult.result || tablesResult.tables || [];
    if (Array.isArray(tables) && tables.length > 0) {
      console.log(`✅ Found ${tables.length} tables`);
      console.log(`   Tables: ${tables.slice(0, 5).join(', ')}${tables.length > 5 ? '...' : ''}`);
    } else {
      throw new Error('list-tables failed or returned invalid data');
    }
    console.log('');

    // Test 2: Describe table
    const testTable = tables.includes(TEST_CONFIG.testTable) 
      ? TEST_CONFIG.testTable 
      : tables[0];
    
    console.log(`🔍 Test 2: Describe table '${testTable}'`);
    const schemaResult = await mcpRequest('schema-describe', { table: testTable });
    console.log('Response:', JSON.stringify(schemaResult, null, 2));
    
    const schema = schemaResult.result || schemaResult.schema || [];
    if (Array.isArray(schema) && schema.length > 0) {
      console.log(`✅ Table has ${schema.length} columns`);
      schema.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type}${col.Key === 'PRI' ? ' (PRIMARY KEY)' : ''}`);
      });
    } else {
      throw new Error('schema-describe failed or returned invalid data');
    }
    console.log('');

    // Test 3: Query data
    console.log(`📊 Test 3: Query data from '${testTable}'`);
    const queryResult = await mcpRequest('query', { 
      query: `SELECT * FROM ${testTable} LIMIT 3` 
    });
    console.log('Response:', JSON.stringify(queryResult, null, 2));
    
    const rows = queryResult.result || queryResult.rows || [];
    if (Array.isArray(rows)) {
      console.log(`✅ Query returned ${rows.length} rows`);
      if (rows.length > 0) {
        console.log('   Sample row:', JSON.stringify(rows[0], null, 2));
      }
    } else {
      throw new Error('query failed or returned invalid data');
    }
    console.log('');

    // Test 4: Query with WHERE clause
    console.log(`🎯 Test 4: Filtered query`);
    const column = schema[0].Field;
    const filteredQuery = await mcpRequest('query', { 
      query: `SELECT * FROM ${testTable} WHERE ${column} IS NOT NULL LIMIT 2` 
    });
    
    const filteredRows = filteredQuery.result || filteredQuery.rows || [];
    if (Array.isArray(filteredRows)) {
      console.log(`✅ Filtered query returned ${filteredRows.length} rows`);
    } else {
      throw new Error('Filtered query failed');
    }
    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n🎉 MariaDB driver is working correctly!');
    console.log('\nNext steps:');
    console.log('1. Open VS Code Command Palette (Ctrl+Shift+P)');
    console.log('2. Run "Configure SQL MCP Connection"');
    console.log('3. Select "MySQL"');
    console.log('4. Enter profile name: "mariadb-nest"');
    console.log('5. Enter connection string: "mysql://root:1234@localhost:3306/nest"');
    console.log('6. Test in chat with: #mcp_ahmad_sql-gat_query SELECT * FROM users LIMIT 5');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  } finally {
    stopServer();
    // Give server time to clean up
    setTimeout(() => process.exit(0), 500);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  stopServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopServer();
  process.exit(0);
});

// Run tests
runTests();

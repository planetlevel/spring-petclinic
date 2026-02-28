#!/usr/bin/env node
/**
 * Contrast Security MCP Server
 *
 * Provides tools for Claude to query runtime vulnerability findings.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as path from 'path';

import {
  discoverAppPackages,
  parseTraceFile,
  findTraceFiles,
  formatVuln,
  formatDataflow,
} from '../lib/trace-parser.js';

// Configuration
const RESULTS_DIR = process.env.CONTRAST_RESULTS_DIR || './contrast-results';
const WORKSPACE_ROOT = process.env.CONTRAST_WORKSPACE_ROOT || process.cwd();

let appPackages = [];
let lastCheckTime = 0;

// Create MCP server
const server = new Server(
  { name: 'contrast-security', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'contrast_list_vulns',
      description: 'List all vulnerabilities detected by Contrast Security.',
      inputSchema: {
        type: 'object',
        properties: {
          ruleId: { type: 'string', description: 'Filter by rule ID (e.g., "sql-injection")' },
        },
      },
    },
    {
      name: 'contrast_get_vuln',
      description: 'Get detailed info about a specific vulnerability.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Vulnerability ID' } },
        required: ['id'],
      },
    },
    {
      name: 'contrast_get_dataflow',
      description: 'Get the complete taint dataflow for a vulnerability.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Vulnerability ID' } },
        required: ['id'],
      },
    },
    {
      name: 'contrast_check_new',
      description: 'Check for new vulnerabilities since last check.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Lazy-load app packages
  if (appPackages.length === 0) {
    appPackages = await discoverAppPackages(WORKSPACE_ROOT);
  }

  const files = await findTraceFiles(RESULTS_DIR);

  switch (name) {
    case 'contrast_list_vulns': {
      if (files.length === 0) {
        return { content: [{ type: 'text', text: 'No vulnerabilities found.' }] };
      }

      let vulns = files.map(f => parseTraceFile(f, appPackages)).filter(v => v !== null);
      if (args?.ruleId) {
        vulns = vulns.filter(v => v.ruleId === args.ruleId);
      }

      if (vulns.length === 0) {
        return { content: [{ type: 'text', text: 'No vulnerabilities found.' }] };
      }

      const output = `Found ${vulns.length} vulnerability(ies):\n` +
        vulns.map(v => formatVuln(v)).join('\n---\n');
      return { content: [{ type: 'text', text: output }] };
    }

    case 'contrast_get_vuln': {
      const file = files.find(f => path.basename(f, '.json') === args.id);
      if (!file) {
        return { content: [{ type: 'text', text: `Vulnerability "${args.id}" not found.` }] };
      }
      const vuln = parseTraceFile(file, appPackages);
      return { content: [{ type: 'text', text: formatVuln(vuln, true) }] };
    }

    case 'contrast_get_dataflow': {
      const file = files.find(f => path.basename(f, '.json') === args.id);
      if (!file) {
        return { content: [{ type: 'text', text: `Vulnerability "${args.id}" not found.` }] };
      }
      const vuln = parseTraceFile(file, appPackages);
      return { content: [{ type: 'text', text: formatDataflow(vuln) }] };
    }

    case 'contrast_check_new': {
      const vulns = files
        .map(f => parseTraceFile(f, appPackages))
        .filter(v => v !== null && new Date(v.raw?.timestamp || 0).getTime() > lastCheckTime);

      lastCheckTime = Date.now();

      if (vulns.length === 0) {
        return { content: [{ type: 'text', text: 'No new vulnerabilities since last check.' }] };
      }

      const output = `🚨 ${vulns.length} NEW vulnerability(ies)!\n` +
        vulns.map(v => formatVuln(v)).join('\n---\n');
      return { content: [{ type: 'text', text: output }] };
    }

    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);

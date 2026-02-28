#!/usr/bin/env node
/**
 * Contrast Security LSP Server
 *
 * Provides IDE diagnostics (squiggly lines) for runtime vulnerabilities
 * detected by Contrast Security IAST agent.
 *
 * Watches contrast-results/ for TRACE-*.json files and publishes
 * diagnostics to the editor.
 */

import {
  createConnection,
  TextDocuments,
  DiagnosticSeverity,
  ProposedFeatures,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

import {
  discoverAppPackages,
  parseTraceFile,
  findTraceFiles,
  getRemediation,
} from '../lib/trace-parser.js';

// Create LSP connection
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Configuration
let resultsDir = './contrast-results';
let workspaceRoot = '';
let appPackages = []; // Discovered from source code

/**
 * Find the full file path for a Java source file
 */
async function findSourceFile(fileName) {
  if (!workspaceRoot) return null;

  const pattern = path.join(workspaceRoot, '**', 'src', '**', fileName);
  const matches = await glob(pattern);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Scan for vulnerabilities and publish diagnostics
 */
async function scanAndPublishDiagnostics() {
  const diagnosticsMap = new Map(); // file -> diagnostics[]

  // Find all TRACE files using shared module
  let traceFiles;
  try {
    traceFiles = await findTraceFiles(resultsDir);
  } catch (err) {
    connection.console.error(`Error scanning for TRACE files: ${err.message}`);
    return;
  }

  connection.console.log(`Found ${traceFiles.length} TRACE files`);

  for (const traceFile of traceFiles) {
    const vuln = parseTraceFile(traceFile, appPackages);
    if (!vuln || !vuln.appCode?.file || !vuln.appCode?.line) continue;

    // Find the full path to the source file
    const fullPath = await findSourceFile(vuln.appCode.file);
    if (!fullPath) {
      connection.console.log(`Could not find source file: ${vuln.appCode.file}`);
      continue;
    }

    const fileUri = `file://${fullPath}`;

    // Create diagnostic
    const diagnostic = {
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: vuln.appCode.line - 1, character: 0 },
        end: { line: vuln.appCode.line - 1, character: 1000 }
      },
      message: `[Contrast] ${vuln.ruleId}: Untrusted data from ${vuln.source.type} "${vuln.source.name}" flows to ${vuln.sink}. ${getRemediation(vuln.ruleId)}`,
      source: 'Contrast Security',
      code: vuln.ruleId,
      data: {
        vulnId: vuln.id,
        route: vuln.route
      }
    };

    if (!diagnosticsMap.has(fileUri)) {
      diagnosticsMap.set(fileUri, []);
    }
    diagnosticsMap.get(fileUri).push(diagnostic);
  }

  // Publish diagnostics for each file
  for (const [fileUri, diagnostics] of diagnosticsMap) {
    connection.sendDiagnostics({ uri: fileUri, diagnostics });
    connection.console.log(`Published ${diagnostics.length} diagnostics for ${fileUri}`);
  }

  // Clear diagnostics for files that no longer have vulns
  // (This would require tracking previously published files)
}

// LSP lifecycle handlers
connection.onInitialize((params) => {
  workspaceRoot = params.rootPath || params.rootUri?.replace('file://', '') || '';
  resultsDir = path.join(workspaceRoot, 'contrast-results');

  connection.console.log(`Contrast LSP initialized. Workspace: ${workspaceRoot}`);
  connection.console.log(`Results dir: ${resultsDir}`);

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
    }
  };
});

connection.onInitialized(async () => {
  // Discover app packages from source code
  appPackages = await discoverAppPackages(workspaceRoot);
  connection.console.log(`Discovered ${appPackages.length} app packages: ${appPackages.join(', ')}`);

  // Initial scan
  scanAndPublishDiagnostics();

  // Watch for changes to contrast-results
  if (fs.existsSync(resultsDir)) {
    fs.watch(resultsDir, { recursive: true }, (eventType, filename) => {
      if (filename && filename.includes('TRACE-')) {
        connection.console.log(`TRACE file changed: ${filename}`);
        // Debounce
        setTimeout(scanAndPublishDiagnostics, 500);
      }
    });
  }
});

// Start server
documents.listen(connection);
connection.listen();

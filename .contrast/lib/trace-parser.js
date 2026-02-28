/**
 * Contrast Security TRACE File Parser
 *
 * Shared module for parsing vulnerability TRACE JSON files.
 * Used by both MCP server and LSP server.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Generated code patterns to always skip
const GENERATED_PATTERNS = [
  '$$FastClassBySpringCGLIB$$',
  '$$EnhancerBySpringCGLIB$$',
  '$$Lambda$',
  '$Proxy',
  '<generated>'
];

/**
 * Scan source directory to find all app packages
 */
export async function discoverAppPackages(workspaceRoot) {
  if (!workspaceRoot) return [];

  const packages = new Set();
  const srcFiles = await glob(path.join(workspaceRoot, '**/src/**/*.java'));

  for (const file of srcFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const match = content.match(/^package\s+([\w.]+)\s*;/m);
      if (match) {
        packages.add(match[1]);
      }
    } catch (err) {
      // Skip unreadable files
    }
  }

  return Array.from(packages);
}

/**
 * Check if a signature belongs to app code (not framework/library)
 */
export function isAppCode(signature, appPackages) {
  if (!signature) return false;
  if (GENERATED_PATTERNS.some(p => signature.includes(p))) return false;
  return appPackages.some(pkg => signature.startsWith(pkg));
}

/**
 * Find the first app code frame in a stack trace
 */
export function findAppCodeFrame(stack, appPackages) {
  if (!stack || !Array.isArray(stack)) return null;

  for (const frame of stack) {
    if (!frame.signature) continue;
    if (frame.file === '<generated>' || frame.file === null) continue;
    if (frame.lineNumber < 1) continue;
    if (!isAppCode(frame.signature, appPackages)) continue;
    return frame;
  }
  return null;
}

/**
 * Parse a TRACE JSON file and extract vulnerability info
 */
export function parseTraceFile(filePath, appPackages = []) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    const ruleId = data.ruleId || 'unknown';
    const request = data.request || {};
    const events = data.events || [];

    // Find the TRIGGER event
    const triggerEvent = events.find(e => e.action === 'TRIGGER');
    if (!triggerEvent) return null;

    // Find app code frame
    const appFrame = appPackages.length > 0
      ? findAppCodeFrame(triggerEvent.stack, appPackages)
      : null;

    // Get source info
    const creationEvent = events.find(e => e.action === 'CREATION');
    const sourceType = creationEvent?.eventSources?.[0]?.sourceType || 'unknown';
    const sourceName = creationEvent?.eventSources?.[0]?.sourceName || 'unknown';

    // Get the sink method
    const sink = triggerEvent.signature
      ? `${triggerEvent.signature.className}.${triggerEvent.signature.methodName}()`
      : 'unknown';

    return {
      id: path.basename(filePath, '.json'),
      filePath,
      ruleId,
      route: `${request.method || 'GET'} ${request.uri || 'unknown'}`,
      source: { type: sourceType, name: sourceName },
      appCode: appFrame ? {
        file: appFrame.file,
        line: appFrame.lineNumber,
        method: appFrame.method || appFrame.signature?.split('(')[0].split('.').pop(),
        signature: appFrame.signature
      } : null,
      sink,
      raw: data
    };
  } catch (err) {
    return null;
  }
}

/**
 * Find all TRACE files in a directory
 */
export async function findTraceFiles(resultsDir) {
  const pattern = path.join(resultsDir, '**', 'TRACE-*.json');
  try {
    return await glob(pattern);
  } catch (err) {
    return [];
  }
}

/**
 * Get remediation guidance for a vulnerability type
 */
export function getRemediation(ruleId) {
  const messages = {
    'hql-injection': 'Use parameterized queries or named parameters instead of string concatenation.',
    'sql-injection': 'Use PreparedStatement with parameterized queries.',
    'cmd-injection': 'Avoid Runtime.exec() with user input. Use ProcessBuilder with argument arrays.',
    'xss': 'Encode output for the appropriate context (HTML, JS, URL).',
    'reflected-xss': 'Encode output appropriately for context.',
    'stored-xss': 'Encode output on display and validate/sanitize on input.',
    'path-traversal': 'Validate and canonicalize file paths. Use an allowlist.',
    'xxe': 'Disable external entity processing in XML parser.',
    'ldap-injection': 'Use parameterized LDAP queries.',
    'header-injection': 'Validate header values, remove newline characters.',
    'log-injection': 'Sanitize user input before logging.',
    'crypto-bad-mac': 'Use HMAC-SHA256 or stronger instead of MD5/SHA1.',
    'crypto-bad-ciphers': 'Use AES-GCM or ChaCha20-Poly1305.',
    'crypto-weak-randomness': 'Use SecureRandom instead of java.util.Random.',
    'unsafe-deserialization': 'Use safe serialization formats (JSON), implement type allowlists.',
  };
  return messages[ruleId] || 'Review and sanitize untrusted input.';
}

/**
 * Format a vulnerability for display
 */
export function formatVuln(vuln, detailed = false) {
  let output = `
VULNERABILITY: ${vuln.ruleId}
  ID: ${vuln.id}
  Route: ${vuln.route}
  Source: ${vuln.source.type} "${vuln.source.name}"
  App Code: ${vuln.appCode ? `${vuln.appCode.file}:${vuln.appCode.line} in ${vuln.appCode.method}()` : 'unknown'}
  Sink: ${vuln.sink}
  FIX: ${getRemediation(vuln.ruleId)}`;

  if (detailed) {
    output += `\n  File: ${vuln.filePath}`;
  }

  return output;
}

/**
 * Format dataflow for a vulnerability
 */
export function formatDataflow(vuln) {
  if (!vuln.raw?.events) return 'No dataflow available';

  let output = `DATAFLOW for ${vuln.ruleId} (${vuln.id})\n`;
  output += `Route: ${vuln.route}\n`;
  output += `\n--- Data Flow ---\n`;

  for (const event of vuln.raw.events) {
    const action = event.action || 'UNKNOWN';
    const method = event.signature
      ? `${event.signature.className}.${event.signature.methodName}()`
      : 'unknown';

    let value = '';
    if (event.ret?.value) {
      try {
        value = Buffer.from(event.ret.value, 'base64').toString('utf-8');
        if (value.length > 100) value = value.substring(0, 100) + '...';
      } catch (e) {
        value = '[binary data]';
      }
    }

    let location = '';
    if (event.stack?.length > 0) {
      const frame = event.stack[0];
      location = `${frame.file}:${frame.lineNumber}`;
    }

    output += `\n${action}: ${method}\n`;
    if (location) output += `  at: ${location}\n`;
    if (value) output += `  value: "${value}"\n`;
    if (event.taintRanges?.length > 0) {
      const ranges = event.taintRanges.map(r => `${r.tag}[${r.range}]`).join(', ');
      output += `  taint: ${ranges}\n`;
    }
  }

  output += `\n--- Remediation ---\n`;
  output += getRemediation(vuln.ruleId);

  return output;
}

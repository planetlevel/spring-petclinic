#!/usr/bin/env node
/**
 * CLI wrapper for Contrast Claude integration
 *
 * Used by shell hooks to delegate logic to Node.js.
 *
 * Commands:
 *   check-new <results-dir> <seen-file> <workspace>  - Find new vulns, output JSON report
 *   list <results-dir> <workspace>                   - List all vulns as JSON
 *   pre-hook                                         - Process PreToolUse hook (reads stdin)
 *   post-hook                                        - Process UserPromptSubmit hook (reads stdin)
 */

import {
  discoverAppPackages,
  parseTraceFile,
  findTraceFiles,
  getRemediation,
} from './trace-parser.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const command = process.argv[2];
const args = process.argv.slice(3);

async function checkNew(resultsDir, seenFile, workspaceRoot) {
  // Load seen vulns
  let seen = new Set();
  if (fs.existsSync(seenFile)) {
    const content = fs.readFileSync(seenFile, 'utf-8');
    content.split('\n').filter(Boolean).forEach(f => seen.add(f));
  }

  // Discover app packages
  const appPackages = await discoverAppPackages(workspaceRoot);

  // Find all TRACE files
  const traceFiles = await findTraceFiles(resultsDir);

  // Filter to new ones
  const newFiles = traceFiles.filter(f => !seen.has(f));

  if (newFiles.length === 0) {
    console.log(JSON.stringify({ vulns: [], count: 0 }));
    return;
  }

  // Parse each new vuln
  const vulns = [];
  for (const file of newFiles) {
    const vuln = parseTraceFile(file, appPackages);
    if (vuln) {
      vulns.push({
        id: vuln.id,
        ruleId: vuln.ruleId,
        route: vuln.route,
        source: vuln.source,
        sink: vuln.sink,
        appCode: vuln.appCode,
        remediation: getRemediation(vuln.ruleId),
        file: file
      });
      // Mark as seen
      fs.appendFileSync(seenFile, file + '\n');
    }
  }

  console.log(JSON.stringify({ vulns, count: vulns.length }));
}

async function list(resultsDir, workspaceRoot) {
  // Discover app packages
  const appPackages = await discoverAppPackages(workspaceRoot);

  // Find all TRACE files
  const traceFiles = await findTraceFiles(resultsDir);

  // Parse each vuln
  const vulns = [];
  for (const file of traceFiles) {
    const vuln = parseTraceFile(file, appPackages);
    if (vuln) {
      vulns.push({
        id: vuln.id,
        ruleId: vuln.ruleId,
        route: vuln.route,
        source: vuln.source,
        sink: vuln.sink,
        appCode: vuln.appCode,
        remediation: getRemediation(vuln.ruleId),
        file: file
      });
    }
  }

  console.log(JSON.stringify({ vulns, count: vulns.length }));
}

// ============== Pre-Hook Logic ==============

// Patterns that indicate "run the JVM with app code"
const APP_RUN_PATTERNS = [
  'java -jar',
  'java -cp',
  'bootRun',
  'spring-boot:run',
  'quarkus:dev',
  'quarkus:test',
  'micronaut:run',
  'run-app',
  'appRun',
  './gradlew test',
  './gradlew iT',
  './gradlew integrationTest',
  'gradle test',
  'gradlew test',
  'mvn test',
  'mvn verify',
  'mvn integration-test',
  'mvn spring-boot:run',
];

// Patterns to skip (fast path for non-Java commands)
const SKIP_PATTERNS = [
  /^git /,
  /^ls/,
  /^cat /,
  /^echo /,
  /^cd /,
  /^pwd/,
  /^mkdir/,
  /^rm /,
  /^cp /,
  /^mv /,
  /^chmod/,
  /^curl /,
  /^wget /,
  /--version/,
  /--help/,
  /^gradle -/,
  /^\.\/gradlew -/,
  /gradlew clean$/,
  /gradlew compile$/,
  /gradlew build$/,
  /gradlew classes$/,
  /gradlew jar$/,
  /gradlew assemble$/,
  /gradle clean$/,
  /gradle build$/,
];

function findAgent() {
  const envPath = process.env.CONTRAST_AGENT_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  if (fs.existsSync('./.contrast/contrast.jar')) return './.contrast/contrast.jar';

  // Check for versioned jar
  try {
    const files = fs.readdirSync('./.contrast');
    const versioned = files.find(f => f.match(/^contrast-agent-.*\.jar$/));
    if (versioned) return `./.contrast/${versioned}`;
  } catch (e) {}

  if (fs.existsSync('/opt/contrast/contrast.jar')) return '/opt/contrast/contrast.jar';

  return null;
}

function shouldSkip(cmd) {
  return SKIP_PATTERNS.some(p => p.test(cmd));
}

function isAppRun(cmd) {
  return APP_RUN_PATTERNS.some(p => cmd.includes(p));
}

function buildAgentArgs(agentPath) {
  let args = `-javaagent:${agentPath}`;
  const configPath = process.env.CONTRAST_CONFIG_PATH;
  if (configPath && fs.existsSync(configPath)) {
    args += ` -Dcontrast.config.path=${configPath}`;
  }
  return args;
}

function injectAgent(cmd, agentPath) {
  const agentArgs = buildAgentArgs(agentPath);

  if (cmd.includes('gradle') || cmd.includes('gradlew')) {
    return `${cmd} -Dorg.gradle.jvmargs="${agentArgs}"`;
  } else if (cmd.includes('mvn')) {
    return `MAVEN_OPTS="${agentArgs}" ${cmd}`;
  } else if (cmd.startsWith('java ')) {
    return cmd.replace('java ', `java ${agentArgs} `);
  }
  return cmd;
}

async function preHook() {
  // Read stdin
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  const data = JSON.parse(input);
  const cmd = data.tool_input?.command || '';

  // Fast path: skip non-Java commands
  if (shouldSkip(cmd)) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow'
      }
    }));
    return;
  }

  // Check if this is an app run
  if (!isAppRun(cmd)) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow'
      }
    }));
    return;
  }

  // Find agent
  const agentPath = findAgent();
  if (!agentPath) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow'
      },
      additionalContext: "Contrast agent not found - run 'npx contrast-claude update' to download"
    }));
    return;
  }

  // Clear old results and seen file for fresh reports
  const resultsDir = process.env.CONTRAST_RESULTS_DIR || './contrast-results';
  const seenFile = process.env.CONTRAST_SEEN_FILE || '.contrast-seen';

  if (fs.existsSync(resultsDir)) {
    fs.rmSync(resultsDir, { recursive: true, force: true });
  }
  if (fs.existsSync(seenFile)) {
    fs.unlinkSync(seenFile);
  }

  // Inject agent
  const modified = injectAgent(cmd, agentPath);

  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      updatedInput: {
        command: modified
      }
    },
    additionalContext: 'Contrast Security agent attached for runtime vulnerability detection'
  }));
}

// ============== Post-Hook Logic ==============

async function postHook() {
  // Read stdin
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  const resultsDir = process.env.CONTRAST_RESULTS_DIR || './contrast-results';
  const seenFile = process.env.CONTRAST_SEEN_FILE || '.contrast-seen';
  const workspace = process.env.CONTRAST_WORKSPACE || '.';

  if (!fs.existsSync(resultsDir)) {
    console.log(JSON.stringify({}));
    return;
  }

  // Load seen vulns
  let seen = new Set();
  if (fs.existsSync(seenFile)) {
    const content = fs.readFileSync(seenFile, 'utf-8');
    content.split('\n').filter(Boolean).forEach(f => seen.add(f));
  }

  // Discover app packages
  const appPackages = await discoverAppPackages(workspace);

  // Find all TRACE files
  const traceFiles = await findTraceFiles(resultsDir);

  // Filter to new ones
  const newFiles = traceFiles.filter(f => !seen.has(f));

  if (newFiles.length === 0) {
    console.log(JSON.stringify({}));
    return;
  }

  // Parse each new vuln - only include those with app code (not library-only vulns)
  const vulns = [];
  for (const file of newFiles) {
    const vuln = parseTraceFile(file, appPackages);
    // Mark as seen regardless (so we don't reprocess)
    fs.appendFileSync(seenFile, file + '\n');
    // Only report vulns that have app code to fix
    if (vuln && vuln.appCode) {
      vulns.push({
        ruleId: vuln.ruleId,
        route: vuln.route,
        source: vuln.source,
        sink: vuln.sink,
        appCode: vuln.appCode,
        remediation: getRemediation(vuln.ruleId),
      });
    }
  }

  if (vulns.length === 0) {
    console.log(JSON.stringify({}));
    return;
  }

  // Build report
  const report = vulns.map(v =>
    `---\nVULNERABILITY: ${v.ruleId}\n  Route: ${v.route}\n  Source: ${v.source.type} "${v.source.name}"\n  App Code: ${v.appCode?.file || 'unknown'}:${v.appCode?.line || '?'} in ${v.appCode?.method || 'unknown'}()\n  Sink: ${v.sink}\nFIX: ${v.remediation}`
  ).join('\n\n');

  console.log(JSON.stringify({
    additionalContext: `CONTRAST SECURITY: ${vulns.length} new vulnerability(ies) detected!\n\n${report}`
  }));
}

// ============== Main ==============

try {
  switch (command) {
    case 'check-new':
      await checkNew(args[0] || './contrast-results', args[1] || '.contrast-seen', args[2] || '.');
      break;
    case 'list':
      await list(args[0] || './contrast-results', args[1] || '.');
      break;
    case 'pre-hook':
      await preHook();
      break;
    case 'post-hook':
      await postHook();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: cli.js <check-new|list|pre-hook|post-hook> [args...]');
      process.exit(1);
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}

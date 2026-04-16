/**
 * LMAS Checkpoint Context Injection Hook
 *
 * Fires on UserPromptSubmit — injects checkpoint summary into context.
 * Only injects ONCE per session (first prompt). Subsequent prompts skip.
 *
 * MULTI-PROJECT MODE (v2):
 * If projects/ directory exists, lists all available projects with brief
 * checkpoint summaries. The agent then asks the user which project to work on.
 *
 * PIPELINE-STATUS INJECTION (v2.1):
 * Reads pipeline-status.yaml from each project and injects a compact
 * sector status summary + bridge blockers + risk count into context.
 *
 * TELEMETRY:
 * - Generates unified session_id (written to .lmas/.session-id) for all hooks
 * - Fire-and-forget session_start ping to Supabase
 * - Tamper detection: checks if other telemetry hooks exist
 *
 * RULES:
 * - ZERO console.log
 * - NEVER block
 * - NEVER fail visibly — all errors exit 0
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const API_BASE_URL = process.env.MATRIX_API_URL || 'https://qaomekspdjfbdeixxjky.supabase.co/functions/v1';

// Use shared token reader (F-7)
const { readTokenCache } = require('./lib/token-reader.cjs');

function main() {
  try {
    const projectDir = PROJECT_ROOT;
    const lmasDir = path.join(projectDir, '.lmas');
    const sessionMarker = path.join(lmasDir, '.ctx-session');

    // LMAS-1.1: Check if heartbeat should re-fire (> 1 hour since last)
    const heartbeatFile = path.join(lmasDir, '.last-heartbeat');
    let shouldPingHeartbeat = true;

    // Context injection: only once per PID
    const ppid = `${process.ppid}`;
    let isNewSession = true;
    try {
      if (fs.existsSync(sessionMarker)) {
        const existing = fs.readFileSync(sessionMarker, 'utf8').trim();
        if (existing === ppid) isNewSession = false;
      }
    } catch { /* proceed */ }

    // Check heartbeat age (independent of session)
    try {
      if (fs.existsSync(heartbeatFile)) {
        const lastHeartbeat = parseInt(fs.readFileSync(heartbeatFile, 'utf8').trim(), 10);
        if (Date.now() - lastHeartbeat < 60 * 60 * 1000) shouldPingHeartbeat = false; // < 1h
      }
    } catch { /* proceed — ping */ }

    // If same PID and no heartbeat needed, skip entirely
    if (!isNewSession && !shouldPingHeartbeat) return;

    // Mark session as injected + generate unified session_id (F-8)
    try {
      if (!fs.existsSync(lmasDir)) fs.mkdirSync(lmasDir, { recursive: true });
      if (isNewSession) {
        fs.writeFileSync(sessionMarker, ppid);
        // Generate and persist unified session_id for all hooks
        const sessionId = `${ppid}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
        fs.writeFileSync(path.join(lmasDir, '.session-id'), sessionId);
      }
    } catch { /* proceed anyway */ }

    // Fire heartbeat if needed (new session OR > 1h since last)
    if (shouldPingHeartbeat) {
      pingSessionStart(projectDir);
      try { fs.writeFileSync(heartbeatFile, String(Date.now())); } catch { /* skip */ }
    }

    // Context injection only on new session
    if (!isNewSession) return;

    // Detect multi-project mode
    const projectsDir = path.join(projectDir, 'projects');
    if (fs.existsSync(projectsDir) && hasSubProjects(projectsDir)) {
      const output = generateMultiProjectContext(projectsDir);
      if (output) process.stdout.write(output);
      return;
    }

    // Legacy: single checkpoint in docs/
    const checkpointPath = path.join(projectDir, 'docs', 'PROJECT-CHECKPOINT.md');
    if (!fs.existsSync(checkpointPath)) return;

    const content = fs.readFileSync(checkpointPath, 'utf8');
    if (!content || content.trim().length < 50) return;

    const summary = generateSummary(content);
    if (summary) process.stdout.write(summary);
  } catch { /* silent */ }
}

function hasSubProjects(projectsDir) {
  try {
    const entries = fs.readdirSync(projectsDir);
    return entries.some(entry => {
      if (entry.startsWith('_') || entry.startsWith('.')) return false;
      const full = path.join(projectsDir, entry);
      if (!fs.statSync(full).isDirectory()) return false;
      return fs.existsSync(path.join(full, '.project.yaml')) ||
             fs.existsSync(path.join(full, 'PROJECT-CHECKPOINT.md'));
    });
  } catch { return false; }
}

function generateMultiProjectContext(projectsDir) {
  const lines = [];
  lines.push('<multi-project-context>');
  lines.push('MODO MULTI-PROJETO ATIVO');
  lines.push('');
  lines.push('PROJETOS DISPONIVEIS:');

  try {
    const entries = fs.readdirSync(projectsDir).sort();
    let projectCount = 0;

    for (const entry of entries) {
      if (entry.startsWith('_') || entry.startsWith('.')) continue;
      const projDir = path.join(projectsDir, entry);
      if (!fs.statSync(projDir).isDirectory()) continue;

      let name = entry;
      let codePath = '';
      let description = '';
      try {
        const yamlPath = path.join(projDir, '.project.yaml');
        if (fs.existsSync(yamlPath)) {
          const yaml = fs.readFileSync(yamlPath, 'utf8');
          const nameMatch = yaml.match(/^name:\s*"?(.+?)"?\s*$/m);
          const codeMatch = yaml.match(/^code_path:\s*"?(.+?)"?\s*$/m);
          const descMatch = yaml.match(/^description:\s*"?(.+?)"?\s*$/m);
          if (nameMatch) name = nameMatch[1];
          if (codeMatch) codePath = codeMatch[1];
          if (descMatch) description = descMatch[1];
        }
      } catch { /* skip */ }

      let activeCtx = '';
      let storyCount = 0;
      try {
        const cpPath = path.join(projDir, 'PROJECT-CHECKPOINT.md');
        if (fs.existsSync(cpPath)) {
          const cp = fs.readFileSync(cpPath, 'utf8');
          const storyMatches = cp.match(/\| .+? \| (Draft|Ready|InProgress|InReview|Done) \|/g);
          storyCount = storyMatches ? storyMatches.length : 0;
          const ctxMatch = cp.match(/## Contexto Ativo\n+((?:(?!##).)+)/s);
          if (ctxMatch) {
            const ctx = ctxMatch[1].trim();
            if (!ctx.includes('(atualizado pelos agentes')) {
              activeCtx = ctx.split('\n')[0].trim().slice(0, 80);
            }
          }
        }
      } catch { /* skip */ }

      let line = `- **${entry}**: ${name}`;
      if (storyCount > 0) line += ` (${storyCount} stories)`;
      if (codePath && codePath !== '.') line += ` [code: ${codePath}]`;
      if (activeCtx) line += ` — ${activeCtx}`;
      else if (description) line += ` — ${description}`;
      lines.push(line);

      // Pipeline-status injection (v2.1)
      const pipelineSummary = parsePipelineStatus(path.join(projDir, 'pipeline-status.yaml'));
      if (pipelineSummary) lines.push(`  ${pipelineSummary}`);

      projectCount++;
    }

    if (projectCount === 0) return null;

    lines.push('');
    lines.push('INSTRUCAO PARA O AGENTE:');
    lines.push('- Se o usuario JA mencionou qual projeto, use-o diretamente');
    lines.push('- Se NAO mencionou, pergunte: "Qual projeto? (lmas/clawin/i5x)"');
    lines.push('- Armazene o projeto ativo NO CONTEXTO desta conversa');
    lines.push('- Leia checkpoint de: projects/{projeto}/PROJECT-CHECKPOINT.md');
    lines.push('- Leia stories de: projects/{projeto}/stories/');
    lines.push('- Leia PRDs de: projects/{projeto}/prd/');
    lines.push('- Para codigo, use o code_path do .project.yaml');
    lines.push('</multi-project-context>');

    return lines.join('\n') + '\n';
  } catch { return null; }
}

/**
 * Parse pipeline-status.yaml and return a compact one-line summary.
 * Lightweight regex-based parsing — no js-yaml dependency.
 *
 * Output format: "brand=not-started | dev=in-progress(current) | bridges: 0 blocked | risks: 2"
 *
 * @param {string} filePath - Absolute path to pipeline-status.yaml
 * @returns {string|null} Compact summary or null if file doesn't exist
 */
function parsePipelineStatus(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content || content.trim().length < 20) return null;

    const parts = [];

    // Extract sectors: match "  {name}:\n    status: {value}\n    current: {value}"
    const sectorRegex = /^ {2}(\w+):\s*\n\s+status:\s*(.+)/gm;
    let match;
    while ((match = sectorRegex.exec(content)) !== null) {
      const name = match[1].trim();
      const status = match[2].trim().replace(/"/g, '');
      // Find current stage for this sector
      const afterSector = content.substring(match.index);
      const currentMatch = afterSector.match(/current:\s*(?:"([^"]*)"|(null|\S+))/);
      const current = currentMatch ? (currentMatch[1] || currentMatch[2] || '').replace(/null/g, '') : '';
      let label = `${name}=${status}`;
      if (current && current !== 'null') label += `(${current.substring(0, 30)})`;
      parts.push(label);
    }

    // Count blocked bridges
    const bridgeBlocked = (content.match(/status:\s*blocked/gi) || []).length;
    const bridgePending = (content.match(/status:\s*pending/gi) || []).length - parts.length; // subtract sector statuses
    if (bridgeBlocked > 0) parts.push(`bridges: ${bridgeBlocked} blocked`);

    // Count risk entries
    const riskEntries = (content.match(/^ {2}- id: RISK-/gm) || []).length;
    if (riskEntries > 0) parts.push(`risks: ${riskEntries}`);

    if (parts.length === 0) return null;
    return parts.join(' | ');
  } catch { return null; }
}

function generateSummary(content) {
  const lines = [];
  lines.push('<checkpoint-context>');

  const sections = {};
  let currentSection = '_header';
  for (const line of content.split('\n')) {
    const match = line.match(/^## (.+)$/);
    if (match) {
      currentSection = match[1].trim();
      sections[currentSection] = '';
    } else {
      sections[currentSection] = (sections[currentSection] || '') + line + '\n';
    }
  }

  // Pipeline-status injection (v2.1) — before active context
  const pipelineSummary = parsePipelineStatus(path.join(PROJECT_ROOT, 'docs', 'pipeline-status.yaml'))
    || parsePipelineStatus(path.join(PROJECT_ROOT, 'pipeline-status.yaml'));
  if (pipelineSummary) {
    lines.push('PIPELINE:');
    lines.push(pipelineSummary);
    lines.push('');
  }

  const ctx = sections['Contexto Ativo']?.trim();
  if (ctx && !ctx.includes('(atualizado pelos agentes')) {
    lines.push('CONTEXTO ATIVO:');
    lines.push(...ctx.split('\n').filter(l => l.trim()).slice(0, 5));
  }

  const dec = sections['Decisoes Tomadas']?.trim();
  if (dec && !dec.includes('(atualizado pelos agentes')) {
    lines.push('');
    lines.push('DECISOES:');
    lines.push(...dec.split('\n').filter(l => l.trim()).slice(0, 5));
  }

  const next = sections['Proximos Passos']?.trim();
  if (next && !next.includes('(atualizado pelos agentes')) {
    lines.push('');
    lines.push('PROXIMOS PASSOS:');
    lines.push(...next.split('\n').filter(l => l.trim()).slice(0, 5));
  }

  const last = sections['Ultimo Trabalho Realizado']?.trim();
  if (last && !last.includes('(checkpoint criado automaticamente')) {
    lines.push('');
    lines.push('ULTIMO TRABALHO:');
    lines.push(...last.split('\n').filter(l => l.trim()).slice(0, 3));
  }

  const git = sections['Git Recente']?.trim();
  if (git) {
    lines.push('');
    lines.push('GIT:');
    lines.push(...git.split('\n').filter(l => l.trim()).slice(0, 3));
  }

  lines.push('</checkpoint-context>');
  if (lines.length <= 2) return null;
  return lines.join('\n') + '\n';
}

/**
 * Fire-and-forget session_start ping to Supabase.
 * Also performs tamper detection (G-5): checks if sibling hooks exist.
 */
function pingSessionStart(projectDir) {
  try {
    const tokenPath = path.join(projectDir, '.lmas', 'token-cache.json');
    const cached = readTokenCache(tokenPath);
    if (!cached) return;

    // Collect metadata
    let version = 'unknown';
    try {
      const vp = path.join(projectDir, '.lmas-core', 'version.json');
      if (fs.existsSync(vp)) version = JSON.parse(fs.readFileSync(vp, 'utf8')).version || version;
    } catch { /* skip */ }

    let agentCount = 0;
    try {
      const agentsDir = path.join(projectDir, '.lmas-core', 'development', 'agents');
      if (fs.existsSync(agentsDir)) agentCount = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md')).length;
    } catch { /* skip */ }

    // G-5: Tamper detection — check if sibling hooks exist
    const expectedHooks = ['session-tracker.cjs', 'state-sync.cjs', 'precompact-session-digest.cjs'];
    const hooksDir = path.join(projectDir, '.claude', 'hooks');
    const missingHooks = [];
    for (const hook of expectedHooks) {
      if (!fs.existsSync(path.join(hooksDir, hook))) {
        missingHooks.push(hook);
      }
    }

    // Read unified session_id
    let sessionId = crypto.randomUUID();
    try {
      const sidPath = path.join(projectDir, '.lmas', '.session-id');
      if (fs.existsSync(sidPath)) sessionId = fs.readFileSync(sidPath, 'utf8').trim();
    } catch { /* use random */ }

    const body = JSON.stringify({
      token: cached.token,
      project_name: cached.project_name || path.basename(projectDir),
      files: [{
        file_type: 'session_start',
        file_path: '_telemetry/session_start',
        file_name: 'session_start',
        content: '',
        content_hash: crypto.randomUUID().slice(0, 16),
        metadata: {
          event: 'session_start',
          os: process.platform,
          framework_version: version,
          agents_available: agentCount,
          session_id: sessionId,
          timestamp: new Date().toISOString(),
          tamper_detected: missingHooks.length > 0 ? missingHooks : undefined,
        },
      }],
    });

    const parsed = new URL(`${API_BASE_URL}/sync-state`);
    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 5000,
    }, () => {});
    req.on('error', () => {});
    req.on('timeout', () => req.destroy());
    req.write(body);
    req.end();
  } catch { /* silent */ }
}

main();

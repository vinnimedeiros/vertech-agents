#!/usr/bin/env node
/**
 * Claude Code Hook: PreCompact Session Digest
 *
 * Registered as PreCompact event — fires before context compaction.
 * Reads JSON from stdin (Claude Code hook protocol), delegates to
 * the unified hook runner in lmas-core.
 *
 * TELEMETRY (G-4):
 * - Fires pingSessionEnd() with session summary
 * - Flushes remaining activity buffer from session-tracker
 * - Uses unified session_id from .lmas/.session-id
 *
 * @see .lmas-core/hooks/unified/runners/precompact-runner.js
 */

'use strict';

const path = require('path');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

// Use shared token reader (F-7)
const { readTokenCache, getSessionId } = require('./lib/token-reader.cjs');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const API_BASE_URL = process.env.MATRIX_API_URL || 'https://qaomekspdjfbdeixxjky.supabase.co/functions/v1';

/** Safety timeout (ms) */
const HOOK_TIMEOUT_MS = 9000;

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('error', (e) => reject(e));
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(e); }
    });
  });
}

/**
 * Save checkpoint state before context compaction.
 */
function saveCheckpointBeforeCompact(projectDir) {
  try {
    const backupDir = path.join(projectDir, '.lmas');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].slice(0, 5);

    const projectsDir = path.join(projectDir, 'projects');
    const isMultiProject = fs.existsSync(projectsDir);

    if (isMultiProject) {
      const projectNames = [];
      try {
        for (const entry of fs.readdirSync(projectsDir)) {
          if (entry.startsWith('_') || entry.startsWith('.')) continue;
          const projDir = path.join(projectsDir, entry);
          if (!fs.statSync(projDir).isDirectory()) continue;
          const cpPath = path.join(projDir, 'PROJECT-CHECKPOINT.md');
          if (!fs.existsSync(cpPath)) continue;

          fs.copyFileSync(cpPath, path.join(backupDir, `.checkpoint-backup-${entry}`));

          const content = fs.readFileSync(cpPath, 'utf8');
          const updated = content.replace(
            /^> Ultima atualizacao:.*$/m,
            `> Ultima atualizacao: ${date} ${time} (pre-compact save)`
          );
          if (updated !== content) fs.writeFileSync(cpPath, updated);

          projectNames.push(entry);
        }
      } catch { /* skip */ }

      process.stdout.write(
        '\n<pre-compact-checkpoint>\n' +
        'IMPORTANTE: O contexto esta sendo compactado.\n' +
        'MODO MULTI-PROJETO: Projetos disponiveis: ' + projectNames.join(', ') + '\n' +
        'PRESERVAR: O projeto ativo desta sessao. NAO mudar de projeto apos compaction.\n' +
        'Antes de continuar, atualize projects/{PROJETO-ATIVO}/PROJECT-CHECKPOINT.md com:\n' +
        '- Contexto Ativo (o que estava sendo feito)\n' +
        '- Decisoes Tomadas (escolhas feitas nesta sessao)\n' +
        '- Proximos Passos (o que falta fazer)\n' +
        '</pre-compact-checkpoint>\n'
      );
    } else {
      const checkpointPath = path.join(projectDir, 'docs', 'PROJECT-CHECKPOINT.md');
      if (!fs.existsSync(checkpointPath)) return;

      fs.copyFileSync(checkpointPath, path.join(backupDir, '.checkpoint-backup'));

      const content = fs.readFileSync(checkpointPath, 'utf8');
      const updated = content.replace(
        /^> Ultima atualizacao:.*$/m,
        `> Ultima atualizacao: ${date} ${time} (pre-compact save)`
      );
      if (updated !== content) fs.writeFileSync(checkpointPath, updated);

      process.stdout.write(
        '\n<pre-compact-checkpoint>\n' +
        'IMPORTANTE: O contexto esta sendo compactado. ' +
        'Antes de continuar, atualize docs/PROJECT-CHECKPOINT.md com:\n' +
        '- Contexto Ativo (o que estava sendo feito)\n' +
        '- Decisoes Tomadas (escolhas feitas nesta sessao)\n' +
        '- Proximos Passos (o que falta fazer)\n' +
        '</pre-compact-checkpoint>\n'
      );
    }
  } catch { /* silent */ }
}

/**
 * G-4: Fire session_end telemetry + flush remaining activity buffer.
 */
function pingSessionEnd(projectDir) {
  try {
    const lmasDir = path.join(projectDir, '.lmas');
    const tokenPath = path.join(lmasDir, 'token-cache.json');
    const cached = readTokenCache(tokenPath);
    if (!cached) return;

    const sessionId = getSessionId(lmasDir);

    // Collect session summary
    const sessionIdPath = path.join(lmasDir, '.session-id');
    let sessionDuration = 0;
    try {
      if (fs.existsSync(sessionIdPath)) {
        const stat = fs.statSync(sessionIdPath);
        sessionDuration = Math.round((Date.now() - stat.mtimeMs) / 60000);
      }
    } catch { /* skip */ }

    // Count sessions dir for total prompts approximation
    let totalPrompts = 0;
    const sessionsDir = path.join(lmasDir, 'sessions');
    try {
      if (fs.existsSync(sessionsDir)) totalPrompts = fs.readdirSync(sessionsDir).length;
    } catch { /* skip */ }

    // Flush remaining activity buffer (G-3 complement)
    let bufferEvents = [];
    const bufferPath = path.join(lmasDir, '.activity-buffer.json');
    try {
      if (fs.existsSync(bufferPath)) {
        const buffer = JSON.parse(fs.readFileSync(bufferPath, 'utf8'));
        if (buffer.events && buffer.events.length > 0) {
          bufferEvents = buffer.events;
        }
        // Clear the buffer
        fs.writeFileSync(bufferPath, JSON.stringify({ events: [], session_id: sessionId, count: 0, created_at: null }));
      }
    } catch { /* skip */ }

    // Collect agents used from usage log
    const agentsUsed = new Set();
    const toolsUsed = new Set();
    try {
      const usageLog = path.join(lmasDir, 'analytics', 'skill-usage.jsonl');
      if (fs.existsSync(usageLog)) {
        const lines = fs.readFileSync(usageLog, 'utf8').split('\n').filter(l => l.trim());
        for (const line of lines.slice(-100)) { // last 100 entries
          try {
            const entry = JSON.parse(line);
            if (entry.skill && entry.skill.startsWith('@')) agentsUsed.add(entry.skill);
            if (entry.skill && entry.skill.startsWith('*')) toolsUsed.add(entry.skill);
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }

    // Build events: session_end + remaining buffer events
    const events = [
      ...bufferEvents,
      {
        event_type: 'session_end',
        data: {
          session_id: sessionId,
          duration_minutes: sessionDuration,
          total_prompts: totalPrompts,
          agents_used: [...agentsUsed],
          tools_used: [...toolsUsed],
          ts: new Date().toISOString(),
        },
      },
    ];

    const body = JSON.stringify({
      token: cached.token,
      session_id: sessionId,
      project_name: cached.project_name || path.basename(projectDir),
      events,
    });

    const parsed = new URL(`${API_BASE_URL}/sync-session-activity`);
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

/** Main hook execution pipeline. */
async function main() {
  const input = await readStdin();
  const projectDir = input.cwd || PROJECT_ROOT;

  // Save checkpoint before compaction
  saveCheckpointBeforeCompact(projectDir);

  // G-4: Fire session_end telemetry + flush buffer
  pingSessionEnd(projectDir);

  // Resolve path to the unified hook runner
  const runnerPath = path.join(
    PROJECT_ROOT,
    '.lmas-core',
    'hooks',
    'unified',
    'runners',
    'precompact-runner.js',
  );

  const context = {
    sessionId: input.session_id,
    projectDir,
    transcriptPath: input.transcript_path,
    trigger: input.trigger || 'auto',
    hookEventName: input.hook_event_name || 'PreCompact',
    permissionMode: input.permission_mode,
    conversation: input,
    provider: 'claude',
  };

  try {
    const { onPreCompact } = require(runnerPath);
    await onPreCompact(context);
  } catch { /* runner may not exist in all installations */ }
}

function run() {
  const timer = setTimeout(() => {
    process.exit(0);
  }, HOOK_TIMEOUT_MS);
  timer.unref();

  main()
    .then(() => {
      clearTimeout(timer);
      process.exitCode = 0;
    })
    .catch(() => {
      clearTimeout(timer);
      process.exitCode = 0;
    });
}

if (require.main === module) run();

module.exports = { readStdin, main, run, HOOK_TIMEOUT_MS };

/**
 * LMAS Checkpoint Reminder Hook
 *
 * Fires on PostToolUse for Edit/Write — detects when an agent modifies
 * a project artifact (story, PRD, ADR, checkpoint) and injects a reminder
 * to update the project checkpoint.
 *
 * Also handles state-sync duties: refreshes auto-generated checkpoint
 * sections (Git Recente, Stories table) periodically.
 *
 * RULES:
 * - Output goes to stdout → Claude sees it in conversation
 * - NEVER block — fast check, exit immediately
 * - NEVER fail visibly — all errors → exit 0
 * - Only remind once per significant action (debounce via marker)
 */

const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DEBOUNCE_MS = 60 * 1000; // 1 min between reminders

function main() {
  try {
    // Read hook input from stdin
    let input;
    try {
      const data = fs.readFileSync(0, 'utf8');
      input = JSON.parse(data);
    } catch { return; }

    const toolName = input.tool_name || '';
    const toolInput = input.tool_input || {};

    // Only process Edit and Write
    if (toolName !== 'Edit' && toolName !== 'Write') return;

    const filePath = toolInput.file_path || '';
    if (!filePath) return;

    // Normalize to relative path
    const rel = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');

    // Check if the file is a project artifact worth reminding about
    const isProjectArtifact = isSignificantArtifact(rel);
    if (!isProjectArtifact) return;

    // Don't remind if they're already editing the checkpoint itself
    if (rel.includes('PROJECT-CHECKPOINT.md')) return;

    // Debounce: don't remind too frequently
    const markerPath = path.join(PROJECT_ROOT, '.lmas', '.checkpoint-reminder-ts');
    try {
      if (fs.existsSync(markerPath)) {
        const lastTs = parseInt(fs.readFileSync(markerPath, 'utf8').trim(), 10);
        if (Date.now() - lastTs < DEBOUNCE_MS) return;
      }
    } catch { /* proceed */ }

    // Detect which project this file belongs to
    const projectId = detectProject(rel);

    // Write debounce marker
    try {
      const lmasDir = path.join(PROJECT_ROOT, '.lmas');
      if (!fs.existsSync(lmasDir)) fs.mkdirSync(lmasDir, { recursive: true });
      fs.writeFileSync(markerPath, `${Date.now()}`);
    } catch { /* proceed */ }

    // Output reminder
    const cpPath = projectId
      ? `projects/${projectId}/PROJECT-CHECKPOINT.md`
      : 'docs/PROJECT-CHECKPOINT.md';

    process.stdout.write(
      `<checkpoint-reminder>` +
      `Voce modificou ${rel}. ` +
      `Atualize ${cpPath} — secoes: Contexto Ativo, Ultimo Trabalho, Proximos Passos.` +
      `</checkpoint-reminder>\n`
    );
  } catch { /* silent */ }
}

/**
 * Check if a file is a significant project artifact
 */
function isSignificantArtifact(rel) {
  // Multi-project artifacts
  if (rel.match(/^projects\/[^/]+\/stories\//)) return true;
  if (rel.match(/^projects\/[^/]+\/prd\//)) return true;
  if (rel.match(/^projects\/[^/]+\/architecture\//)) return true;

  // Legacy artifacts
  if (rel.startsWith('docs/stories/')) return true;
  if (rel.match(/^docs\/(prd|architecture|adr-|spec)/i)) return true;

  // Source code in packages
  if (rel.startsWith('packages/') && rel.endsWith('.ts')) return true;
  if (rel.startsWith('packages/') && rel.endsWith('.tsx')) return true;
  if (rel.startsWith('packages/') && rel.endsWith('.js')) return true;

  return false;
}

/**
 * Detect which project a file belongs to
 */
function detectProject(rel) {
  const match = rel.match(/^projects\/([^/]+)\//);
  return match ? match[1] : null;
}

main();

/**
 * L2 Agent-Scoped Layer Processor
 *
 * Injects agent-specific rules based on the currently active agent.
 * Detects the active agent from session.active_agent.id or prompt text,
 * and finds the matching domain via agentTrigger in the manifest.
 *
 * Authority boundaries (rules containing 'AUTH') are always included.
 *
 * @module core/synapse/layers/l2-agent
 * @version 1.1.0
 * @created Story SYN-4 - Layer Processors L0-L3
 * @modified Fix F2 - Prompt-based agent detection fallback
 */

const path = require('path');
const { loadDomainFile } = require('../domain/domain-loader');
const LayerProcessor = require('./layer-processor');

/**
 * L2 Agent-Scoped Processor
 *
 * Loads agent-specific domain file when an agent is active.
 * Returns null if no agent is active or no matching domain found.
 *
 * @extends LayerProcessor
 */
class L2AgentProcessor extends LayerProcessor {
  constructor() {
    super({ name: 'agent', layer: 2, timeout: 15 });
  }

  /**
   * Load agent-specific rules based on active agent.
   *
   * Detection flow:
   * 1. Get active agent ID from session.active_agent.id OR prompt text
   * 2. Find domain with matching agentTrigger in manifest
   * 3. Load domain file via domain-loader
   * 4. Filter authority boundaries (rules containing 'AUTH')
   *
   * @param {object} context
   * @param {string} context.prompt - Current prompt text
   * @param {object} context.session - Session state (SYN-2 schema)
   * @param {object} context.config - Config with synapsePath and manifest
   * @param {object[]} context.previousLayers - Results from previous layers
   * @returns {{ rules: string[], metadata: object } | null}
   */
  process(context) {
    const { prompt, session, config } = context;
    const { manifest, synapsePath } = config;

    // 1. Get active agent ID (session state OR prompt detection)
    let agentId = session.active_agent?.id;

    // Fallback: detect agent from prompt text (skill invocations, @mentions)
    if (!agentId && prompt) {
      agentId = this._detectAgentFromPrompt(prompt, manifest);
    }

    if (!agentId) {
      return null;
    }

    // 2. Find domain with matching agentTrigger
    const domainKey = Object.keys(manifest.domains || {})
      .find(k => manifest.domains[k].agentTrigger === agentId);

    if (!domainKey) {
      return null;
    }

    // 3. Load domain file
    const domain = manifest.domains[domainKey];
    const domainFile = domain.file
      ? path.join(synapsePath, domain.file)
      : path.join(synapsePath, `agent-${agentId}`);

    const rules = loadDomainFile(domainFile);

    // Graceful degradation: domain file missing or empty
    if (!rules || rules.length === 0) {
      return null;
    }

    // 4. Check for authority boundaries
    const hasAuthority = rules.some(r => r.toUpperCase().includes('AUTH'));

    return {
      rules,
      metadata: {
        layer: 2,
        source: `agent-${agentId}`,
        agentId,
        hasAuthority,
      },
    };
  }

  /**
   * Detect active agent from prompt text patterns.
   *
   * Matches:
   * - /LMAS:agents:{agent-id} (skill invocation)
   * - @{agent-id} (mention at word boundary)
   *
   * Only matches agents that have agentTrigger in the manifest.
   *
   * @param {string} prompt - User prompt text
   * @param {object} manifest - Parsed manifest
   * @returns {string|null} Agent ID or null
   * @private
   */
  _detectAgentFromPrompt(prompt, manifest) {
    if (!prompt || !manifest || !manifest.domains) return null;

    // Collect all known agent triggers from manifest
    const triggers = [];
    for (const [, domain] of Object.entries(manifest.domains)) {
      if (domain.agentTrigger) {
        triggers.push(domain.agentTrigger);
      }
    }

    if (triggers.length === 0) return null;

    const promptLower = prompt.toLowerCase();

    // Pattern 1: /LMAS:agents:{id} (skill invocation — highest confidence)
    for (const trigger of triggers) {
      if (promptLower.includes('/lmas:agents:' + trigger)) {
        return trigger;
      }
    }

    // Pattern 2: @{id} at word boundary (mention)
    for (const trigger of triggers) {
      const regex = new RegExp('@' + trigger + '\\b', 'i');
      if (regex.test(prompt)) {
        return trigger;
      }
    }

    return null;
  }
}

module.exports = L2AgentProcessor;

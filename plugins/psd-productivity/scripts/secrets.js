#!/usr/bin/env bun

/**
 * PSD Productivity Secrets Manager (JavaScript)
 *
 * Loads secrets using a priority chain:
 *   1. Environment variables (from shell profile — safest)
 *   2. ~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env file
 *
 * This is the JS counterpart to secrets.py. Both read from the same sources.
 * Setup: See SECRETS-SETUP.md in this plugin for instructions.
 */

const { readFileSync } = require('fs');
const { join } = require('path');
const { homedir } = require('os');

// Where the .env file lives (Geoffrey's iCloud secrets directory)
const ENV_FILE = join(
  homedir(),
  'Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env'
);

// Cache for .env file values
let _envCache = null;

function _loadEnvFile() {
  if (_envCache !== null) return _envCache;
  _envCache = {};

  try {
    const content = readFileSync(ENV_FILE, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const eqIdx = trimmed.indexOf('=');
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((value.startsWith("'") && value.endsWith("'")) ||
          (value.startsWith('"') && value.endsWith('"'))) {
        value = value.slice(1, -1);
      }
      if (key && value) _envCache[key] = value;
    }
  } catch {
    // File not found or not readable — rely on env vars
  }

  return _envCache;
}

/**
 * Get a secret by name. Checks environment variables first, then .env file.
 * Returns undefined if not found.
 */
function getSecret(name) {
  // 1. Environment variable (highest priority)
  if (process.env[name]) return process.env[name];

  // 2. .env file
  const envFile = _loadEnvFile();
  if (envFile[name]) return envFile[name];

  return undefined;
}

/**
 * Require a secret — throws with setup instructions if not found.
 */
function requireSecret(name) {
  const value = getSecret(name);
  if (!value) {
    throw new Error(
      `Missing required secret: ${name}\n\n` +
      `Set it using ONE of these methods:\n\n` +
      `  Option A (safest) — Add to your shell profile (~/.zshrc):\n` +
      `    export ${name}="your-key-here"\n` +
      `    Then restart your terminal.\n\n` +
      `  Option B — Add to ${ENV_FILE}:\n` +
      `    ${name}=your-key-here\n\n` +
      `See SECRETS-SETUP.md in the psd-productivity plugin for full instructions.`
    );
  }
  return value;
}

/**
 * Service-specific namespaces matching how scripts destructure SECRETS.
 *
 * Usage:
 *   const { SECRETS } = require('../../../scripts/secrets.js');
 *   const { domain, apiKey } = SECRETS.freshservice;
 *   const { host, apiKey } = SECRETS.n8n;
 */
const SECRETS = {
  get freshservice() {
    return {
      domain: requireSecret('FRESHSERVICE_DOMAIN'),
      apiKey: requireSecret('FRESHSERVICE_API_KEY'),
    };
  },

  get redrover() {
    return {
      username: requireSecret('RED_ROVER_USERNAME'),
      password: requireSecret('RED_ROVER_PASSWORD'),
      apiKey: getSecret('RED_ROVER_API_KEY'),
    };
  },

  get n8n() {
    return {
      host: requireSecret('N8N_HOST'),
      apiKey: requireSecret('N8N_API_KEY'),
      mcpToken: getSecret('N8N_MCP_TOKEN'),
    };
  },

  get documenso() {
    return {
      host: requireSecret('DOCUMENSO_HOST'),
      apiKey: requireSecret('DOCUMENSO_API_KEY'),
    };
  },

  // AI Studio Atrium. The host defaults to production because AI Studio ships no
  // prod/dev switch of its own — the origin is pinned in every first-party client
  // — so ATRIUM_HOST exists only to point the skill at dev.aistudio.psd401.ai.
  get atrium() {
    return {
      host: getSecret('ATRIUM_HOST') || 'aistudio.psd401.ai',
      apiKey: requireSecret('ATRIUM_API_KEY'),
    };
  },

  get openai() {
    return { apiKey: requireSecret('OPENAI_API_KEY') };
  },

  get gemini() {
    return { apiKey: requireSecret('GEMINI_API_KEY') };
  },

  get perplexity() {
    return { apiKey: requireSecret('PERPLEXITY_API_KEY') };
  },

  get xai() {
    return { apiKey: requireSecret('XAI_API_KEY') };
  },

  get google() {
    return {
      clientId: requireSecret('GOOGLE_CLIENT_ID'),
      clientSecret: requireSecret('GOOGLE_CLIENT_SECRET'),
      apiKey: getSecret('GOOGLE_API_KEY'),
    };
  },

  get elevenlabs() {
    return { apiKey: requireSecret('ELEVENLABS_API_KEY') };
  },

  get docusign() {
    return {
      integrationKey: requireSecret('DOCUSIGN_INTEGRATION_KEY'),
      userId: requireSecret('DOCUSIGN_USER_ID'),
      accountId: requireSecret('DOCUSIGN_ACCOUNT_ID'),
      rsaKeyPath: requireSecret('DOCUSIGN_RSA_KEY_PATH'),
      environment: getSecret('DOCUSIGN_ENVIRONMENT') || 'production',
    };
  },
};

module.exports = { SECRETS, getSecret, requireSecret };

// CLI mode — run directly to check secrets availability
if (require.main === module) {
  const knownSecrets = [
    'FRESHSERVICE_DOMAIN', 'FRESHSERVICE_API_KEY',
    'OPENAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY',
    'PERPLEXITY_API_KEY', 'XAI_API_KEY',
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
    'ELEVENLABS_API_KEY',
    'RED_ROVER_USERNAME', 'RED_ROVER_PASSWORD', 'RED_ROVER_API_KEY',
    'N8N_HOST', 'N8N_API_KEY', 'N8N_MCP_TOKEN',
    'DOCUMENSO_HOST', 'DOCUMENSO_API_KEY',
    'ATRIUM_HOST', 'ATRIUM_API_KEY',
    'DOCUSIGN_INTEGRATION_KEY', 'DOCUSIGN_USER_ID', 'DOCUSIGN_ACCOUNT_ID',
    'DOCUSIGN_RSA_KEY_PATH', 'DOCUSIGN_ENVIRONMENT',
  ];

  console.log('Secret availability:');
  for (const name of knownSecrets) {
    const val = getSecret(name);
    const status = val ? 'SET' : 'NOT SET';
    console.log(`  ${name}: ${status}`);
  }
}

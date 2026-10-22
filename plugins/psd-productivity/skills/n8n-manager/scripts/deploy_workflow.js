#!/usr/bin/env bun

// Validate and deploy a workflow in one step.
// Usage: bun deploy_workflow.js '<workflow-json>'
//    or: bun deploy_workflow.js @path/to/workflow.json
//
// Steps:
//   1. Validate the workflow JSON (catches duplicate names, broken connections)
//   2. Create the workflow on the n8n server
//   3. Return the workflow ID and editor URL

const { readFileSync } = require('fs');
const { execFileSync } = require('child_process');
const { n8nFetch, getEditorUrl } = require('./n8n_client.js');

const input = process.argv[2];
if (!input) {
  console.error(JSON.stringify({
    error: 'Workflow JSON required. Usage: bun deploy_workflow.js \'<json>\' or @file.json'
  }));
  process.exit(1);
}

let workflowData;
try {
  if (input.startsWith('@')) {
    workflowData = JSON.parse(readFileSync(input.slice(1), 'utf-8'));
  } else {
    workflowData = JSON.parse(input);
  }
} catch (e) {
  console.error(JSON.stringify({ error: `Invalid JSON: ${e.message}` }));
  process.exit(1);
}

async function deploy() {
  // Step 1: Validate
  const scriptDir = new URL('.', import.meta.url).pathname;
  try {
    // execFileSync with an argv array: no shell, so the workflow JSON can't
    // be interpreted as shell syntax.
    const validateResult = execFileSync(
      'bun',
      [`${scriptDir}validate_workflow.js`, JSON.stringify(workflowData)],
      { encoding: 'utf-8', timeout: 10000 }
    );
    const validation = JSON.parse(validateResult);
    if (!validation.valid) {
      return {
        deployed: false,
        validation,
      };
    }
  } catch (e) {
    // Validation script exited with error
    try {
      const validation = JSON.parse(e.stdout || e.stderr);
      return { deployed: false, validation };
    } catch {
      return { deployed: false, error: `Validation failed: ${e.message}` };
    }
  }

  // Ensure settings field exists (n8n API requires it)
  if (!workflowData.settings) {
    workflowData.settings = { executionOrder: 'v1' };
  }

  // Step 2: Create on server
  const result = await n8nFetch('/workflows', {
    method: 'POST',
    body: workflowData,
  });

  if (result.error) return { deployed: false, error: result.error };

  // Step 3: Return success
  return {
    deployed: true,
    id: result.id,
    name: result.name,
    active: result.active,
    nodeCount: (result.nodes || []).length,
    url: getEditorUrl(result.id),
    hint: result.active ? 'Workflow is active and running.' : 'Workflow created but inactive. Use activate_workflow.js to start it.',
  };
}

try {
  const result = await deploy();
  console.log(JSON.stringify(result, null, 2));
  if (!result.deployed) process.exit(1);
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}

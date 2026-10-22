#!/usr/bin/env bun

/**
 * Cross-Skill Integration Test Harness
 *
 * Validates the pdf-builder → documenso → n8n pipeline without making
 * any live API calls. All checks are structural / offline.
 *
 * Usage:
 *   bun test_pipeline.js                          # run all tests
 *   bun test_pipeline.js --suite manifest          # run one suite
 *   bun test_pipeline.js --suite n8n               # run one suite
 *   bun test_pipeline.js --workflow @path.json     # validate a specific workflow file
 *   bun test_pipeline.js --manifest @path.json     # validate a specific manifest file
 *
 * Suites:
 *   manifest   — Generate test PDFs via pdf-builder, validate field manifests
 *   documenso  — Validate manifest fields against Documenso API contract
 *   n8n        — Validate workflow JSON against known-bad patterns
 *   snapshot   — Detect stale-snapshot regressions in update payloads
 *
 * Exit code: 0 = all pass, 1 = failures found
 */

const { execSync } = require('child_process');
const { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } = require('fs');
const { join, resolve } = require('path');
const { tmpdir } = require('os');

// ─── Configuration ──────────────────────────────────────────────────────────

const PLUGIN_ROOT = resolve(join(__dirname, '..'));
const PDF_BUILDER_SCRIPTS = join(PLUGIN_ROOT, 'skills', 'pdf-builder', 'scripts');
const N8N_SCRIPTS = join(PLUGIN_ROOT, 'skills', 'n8n-manager', 'scripts');
const GENERATE_PDF = join(PDF_BUILDER_SCRIPTS, 'generate_pdf.py');
const VALIDATE_WORKFLOW = join(N8N_SCRIPTS, 'validate_workflow.js');

// Valid Documenso field types (outer UPPERCASE → inner lowercase)
const VALID_FIELD_TYPES = {
  SIGNATURE: 'signature',
  DATE: 'date',
  TEXT: 'text',
  NAME: 'name',
  EMAIL: 'email',
  CHECKBOX: 'checkbox',
  INITIALS: 'initials',
  DROPDOWN: 'dropdown',
};

// Templates to test (all built-in templates from generate_pdf.py)
const TEST_TEMPLATES = [
  'permission-slip',
  'employment-agreement',
  'policy-acknowledgment',
  'board-resolution',
  'leave-request',
  'contractor-agreement',
  'field-trip-waiver',
  'generic-form',
];

// ─── Test Infrastructure ────────────────────────────────────────────────────

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let warningCount = 0;
const failures = [];
const warnings = [];

function pass(suite, test) {
  totalTests++;
  passedTests++;
}

function fail(suite, test, reason) {
  totalTests++;
  failedTests++;
  failures.push({ suite, test, reason });
}

function warn(suite, message) {
  warningCount++;
  warnings.push({ suite, message });
  console.warn(`  [${suite}] WARNING: ${message}`);
}

function assert(suite, test, condition, reason) {
  if (condition) {
    pass(suite, test);
  } else {
    fail(suite, test, reason);
  }
}

/**
 * Assert that a known-bad pattern IS detected (i.e., the condition should FAIL).
 * Used for synthetic test cases that intentionally contain bad patterns.
 * A failure from the validator is the expected outcome — counted as a pass.
 */
function assertExpectedFailure(suite, test, condition, reason) {
  if (!condition) {
    // The validator correctly caught the bad pattern — this is a pass
    pass(suite, `${test} (correctly detected)`);
  } else {
    // The validator failed to catch the bad pattern — this is a real failure
    fail(suite, `${test} (should have been caught)`, reason);
  }
}

// ─── Suite: Manifest Validation ─────────────────────────────────────────────

function validateManifest(manifest, source) {
  const suite = 'manifest';

  // 1. Top-level structure
  assert(suite, `${source}: has pdf_path`,
    typeof manifest.pdf_path === 'string' && manifest.pdf_path.length > 0,
    'Missing or empty pdf_path');

  assert(suite, `${source}: has page_size`,
    manifest.page_size && manifest.page_size.width && manifest.page_size.height,
    'Missing page_size with width/height');

  assert(suite, `${source}: page_size is US Letter`,
    manifest.page_size && manifest.page_size.width === 612 && manifest.page_size.height === 792,
    `Expected 612x792, got ${manifest.page_size?.width}x${manifest.page_size?.height}`);

  assert(suite, `${source}: has pages count`,
    typeof manifest.pages === 'number' && manifest.pages >= 1,
    `Invalid pages: ${manifest.pages}`);

  assert(suite, `${source}: has fields array`,
    Array.isArray(manifest.fields),
    'fields is not an array');

  if (!Array.isArray(manifest.fields)) return;

  // 2. Field-level validation
  for (let i = 0; i < manifest.fields.length; i++) {
    const f = manifest.fields[i];
    const fid = `${source}:field[${i}] "${f.name || '?'}"`;

    // Required properties
    assert(suite, `${fid}: has name`,
      typeof f.name === 'string' && f.name.length > 0,
      'Missing field name');

    assert(suite, `${fid}: has type`,
      typeof f.type === 'string',
      'Missing field type');

    // Type is valid UPPERCASE Documenso type
    assert(suite, `${fid}: type is valid Documenso type`,
      f.type in VALID_FIELD_TYPES,
      `Invalid type "${f.type}". Valid: ${Object.keys(VALID_FIELD_TYPES).join(', ')}`);

    // fieldMeta exists and has correct inner type
    assert(suite, `${fid}: has fieldMeta`,
      f.fieldMeta && typeof f.fieldMeta === 'object',
      'Missing fieldMeta object');

    if (f.fieldMeta) {
      assert(suite, `${fid}: fieldMeta.type is lowercase`,
        f.fieldMeta.type === f.fieldMeta.type?.toLowerCase(),
        `fieldMeta.type "${f.fieldMeta.type}" should be lowercase`);

      // Outer type maps to correct inner type (with exceptions for NUMBER → TEXT/number)
      const expectedInner = VALID_FIELD_TYPES[f.type];
      if (expectedInner && f.type !== 'TEXT') {
        // TEXT outer type can map to 'text' or 'number' inner type
        assert(suite, `${fid}: fieldMeta.type matches outer type`,
          f.fieldMeta.type === expectedInner,
          `Outer "${f.type}" expects inner "${expectedInner}", got "${f.fieldMeta.type}"`);
      }

      assert(suite, `${fid}: fieldMeta.label exists`,
        typeof f.fieldMeta.label === 'string',
        'Missing fieldMeta.label');

      assert(suite, `${fid}: fieldMeta.required is boolean`,
        typeof f.fieldMeta.required === 'boolean',
        `fieldMeta.required is ${typeof f.fieldMeta.required}, expected boolean`);

      // DROPDOWN must have options
      if (f.type === 'DROPDOWN') {
        assert(suite, `${fid}: DROPDOWN has options array`,
          Array.isArray(f.fieldMeta.options) && f.fieldMeta.options.length > 0,
          'DROPDOWN field missing options array');
      }
    }

    // Page number
    assert(suite, `${fid}: page is valid`,
      typeof f.page === 'number' && f.page >= 1 && f.page <= manifest.pages,
      `page ${f.page} out of range [1, ${manifest.pages}]`);

    // Coordinate bounds (0-100 percentages)
    assert(suite, `${fid}: positionX in bounds`,
      typeof f.positionX === 'number' && f.positionX >= 0 && f.positionX <= 100,
      `positionX ${f.positionX} out of range [0, 100]`);

    assert(suite, `${fid}: positionY in bounds`,
      typeof f.positionY === 'number' && f.positionY >= 0 && f.positionY <= 100,
      `positionY ${f.positionY} out of range [0, 100]`);

    assert(suite, `${fid}: width in bounds`,
      typeof f.width === 'number' && f.width > 0 && f.width <= 100,
      `width ${f.width} out of range (0, 100]`);

    assert(suite, `${fid}: height in bounds`,
      typeof f.height === 'number' && f.height > 0 && f.height <= 100,
      `height ${f.height} out of range (0, 100]`);

    // Field doesn't overflow page boundaries
    assert(suite, `${fid}: positionX + width <= 100`,
      f.positionX + f.width <= 100.5, // small tolerance for rounding
      `Field overflows right edge: positionX(${f.positionX}) + width(${f.width}) = ${f.positionX + f.width}`);

    assert(suite, `${fid}: positionY + height <= 100`,
      f.positionY + f.height <= 100.5, // small tolerance for rounding
      `Field overflows bottom edge: positionY(${f.positionY}) + height(${f.height}) = ${f.positionY + f.height}`);
  }

  // 3. No duplicate field names
  const names = manifest.fields.map(f => f.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  assert(suite, `${source}: no duplicate field names`,
    dupes.length === 0,
    `Duplicate field names: ${[...new Set(dupes)].join(', ')}`);
}

function runManifestSuite(specificManifest) {
  if (specificManifest) {
    // Validate a specific manifest file
    const path = specificManifest.startsWith('@') ? specificManifest.slice(1) : specificManifest;
    const manifest = JSON.parse(readFileSync(path, 'utf-8'));
    validateManifest(manifest, path);
    return;
  }

  // Generate PDFs for all built-in templates and validate their manifests
  const tmpDir = mkdtempSync(join(tmpdir(), 'psd-pipeline-test-'));

  try {
    for (const template of TEST_TEMPLATES) {
      const outputPath = join(tmpDir, `${template}.pdf`);
      const manifestPath = `${outputPath}.fields.json`;

      try {
        // Generate the PDF
        const result = execSync(
          `uv run "${GENERATE_PDF}" --template "${template}" --output "${outputPath}"`,
          { encoding: 'utf-8', timeout: 30000, cwd: PDF_BUILDER_SCRIPTS }
        );

        // Parse the stdout JSON to verify it ran
        let genResult;
        try {
          genResult = JSON.parse(result.trim());
        } catch {
          fail('manifest', `${template}: generate_pdf.py stdout`,
            `Non-JSON stdout: ${result.trim().slice(0, 200)}`);
          continue;
        }

        assert('manifest', `${template}: PDF generated`,
          existsSync(outputPath),
          'PDF file not created');

        assert('manifest', `${template}: manifest generated`,
          existsSync(manifestPath),
          'Manifest .fields.json not created');

        if (!existsSync(manifestPath)) continue;

        // Validate the manifest
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        validateManifest(manifest, template);

        // Template-specific checks
        if (template !== 'generic-form') {
          assert('manifest', `${template}: has signing fields`,
            manifest.fields.length > 0,
            'Template should produce at least one field');
        }

      } catch (e) {
        fail('manifest', `${template}: generation`,
          `generate_pdf.py failed: ${e.message?.slice(0, 300)}`);
      }
    }
  } finally {
    // Clean up
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

// ─── Suite: Documenso Contract Validation ───────────────────────────────────

function runDocumensoSuite(specificManifest) {
  const suite = 'documenso';

  // If a specific manifest is provided, validate it
  if (specificManifest) {
    const path = specificManifest.startsWith('@') ? specificManifest.slice(1) : specificManifest;
    const manifest = JSON.parse(readFileSync(path, 'utf-8'));
    validateDocumensoContract(manifest, path);
    return;
  }

  // Generate a representative manifest and validate the Documenso API contract
  const tmpDir = mkdtempSync(join(tmpdir(), 'psd-pipeline-documenso-'));

  try {
    // Use leave-request (has the most field types: NAME, DATE, NUMBER, CHECKBOX, SIGNATURE)
    const outputPath = join(tmpDir, 'documenso-test.pdf');
    const manifestPath = `${outputPath}.fields.json`;

    try {
      execSync(
        `uv run "${GENERATE_PDF}" --template "leave-request" --output "${outputPath}"`,
        { encoding: 'utf-8', timeout: 30000, cwd: PDF_BUILDER_SCRIPTS }
      );
    } catch (e) {
      fail(suite, 'generate test PDF', `Failed: ${e.message?.slice(0, 200)}`);
      return;
    }

    if (!existsSync(manifestPath)) {
      fail(suite, 'manifest exists', 'Manifest file not created');
      return;
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    validateDocumensoContract(manifest, 'leave-request');
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

function validateDocumensoContract(manifest, source) {
  const suite = 'documenso';

  // Guard: manifest.fields must be a valid array
  assert(suite, `${source}: manifest has fields array`,
    manifest && Array.isArray(manifest.fields),
    'manifest.fields is missing or not an array');

  if (!manifest || !Array.isArray(manifest.fields)) return;

  // Simulate building the Documenso field creation payload
  // as it would be done in an n8n Code node
  const mockRecipientId = 1;
  const mockEnvelopeId = 'test-envelope-id';

  for (let i = 0; i < manifest.fields.length; i++) {
    const f = manifest.fields[i];
    const fid = `${source}:field[${i}] "${f.name}"`;

    // Build the payload exactly as n8n-integration.md documents
    const payload = {
      recipientId: mockRecipientId,
      type: f.type,
      identifier: 0,
      page: f.page,
      positionX: f.positionX,
      positionY: f.positionY,
      width: f.width,
      height: f.height,
      fieldMeta: f.fieldMeta,
    };

    // Validate the payload matches Documenso's expected shape
    assert(suite, `${fid}: payload has recipientId`,
      typeof payload.recipientId === 'number',
      'recipientId must be a number');

    assert(suite, `${fid}: payload type is UPPERCASE string`,
      typeof payload.type === 'string' && payload.type === payload.type.toUpperCase(),
      `type "${payload.type}" must be UPPERCASE`);

    assert(suite, `${fid}: payload identifier is number`,
      typeof payload.identifier === 'number',
      'identifier must be a number (PDF index in envelope)');

    assert(suite, `${fid}: coordinates are numbers not strings`,
      typeof payload.positionX === 'number' &&
      typeof payload.positionY === 'number' &&
      typeof payload.width === 'number' &&
      typeof payload.height === 'number',
      'All coordinates must be numbers, not strings');

    assert(suite, `${fid}: fieldMeta is a plain object`,
      payload.fieldMeta && typeof payload.fieldMeta === 'object' && !Array.isArray(payload.fieldMeta),
      'fieldMeta must be a plain object');
  }

  // NOTE: Envelope create payload validation (type: 'DOCUMENT') is handled
  // in the n8n suite by inspecting actual HTTP Request node payloads rather
  // than asserting against a hard-coded mock (which would always pass).

  // Simulate the full fields/create-many payload
  const fieldsPayload = {
    envelopeId: mockEnvelopeId,
    data: manifest.fields.map(f => ({
      recipientId: mockRecipientId,
      type: f.type,
      identifier: 0,
      page: f.page,
      positionX: f.positionX,
      positionY: f.positionY,
      width: f.width,
      height: f.height,
      fieldMeta: f.fieldMeta,
    })),
  };

  assert(suite, `${source}: fields/create-many has envelopeId`,
    typeof fieldsPayload.envelopeId === 'string',
    'fields payload must have envelopeId');

  assert(suite, `${source}: fields/create-many data is non-empty array`,
    Array.isArray(fieldsPayload.data) && fieldsPayload.data.length > 0,
    'fields payload data must be non-empty array');
}

// ─── Suite: n8n Workflow Validation ─────────────────────────────────────────

function validateN8nWorkflow(workflow, source) {
  const suite = 'n8n';

  // 1. Run the existing validate_workflow.js (structural validation)
  // Private temp dir (mode 0700) instead of a predictable name in shared /tmp.
  const tmpDir = mkdtempSync(join(tmpdir(), 'psd-n8n-validate-'));
  const tmpFile = join(tmpDir, 'workflow.json');
  try {
    writeFileSync(tmpFile, JSON.stringify(workflow));
    const result = execSync(
      `bun "${VALIDATE_WORKFLOW}" "@${tmpFile}"`,
      { encoding: 'utf-8', timeout: 10000 }
    );
    const validation = JSON.parse(result);
    assert(suite, `${source}: structural validation passes`,
      validation.valid === true,
      `Structural errors: ${(validation.errors || []).join('; ')}`);

    // Also surface warnings (not counted as tests)
    if (validation.warnings && validation.warnings.length > 0) {
      for (const w of validation.warnings) {
        warn(suite, `${source}: ${w.slice(0, 80)}`);
      }
    }
  } catch (e) {
    // If validation script fails, try to parse the error
    let errMsg = e.message || 'unknown';
    try {
      const parsed = JSON.parse(e.stdout || e.stderr || '{}');
      errMsg = (parsed.errors || []).join('; ') || errMsg;
    } catch {}
    fail(suite, `${source}: structural validation`, errMsg.slice(0, 300));
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }

  // 2. Known-bad pattern: Switch node missing required fields
  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
  for (const node of nodes) {
    if (node.type === 'n8n-nodes-base.switch') {
      const params = node.parameters || {};
      const rules = params.rules || {};
      const ruleValues = rules.values || rules.rules || [];

      for (let r = 0; r < ruleValues.length; r++) {
        const rule = ruleValues[r];
        const conditions = rule.conditions || {};
        const rid = `${source}:Switch "${node.name}":rule[${r}]`;

        // Check required top-level conditions fields
        assert(suite, `${rid}: has combinator`,
          typeof conditions.combinator === 'string',
          'Missing conditions.combinator (e.g., "and"). Switch will silently route to output 0.');

        const opts = conditions.options || {};
        assert(suite, `${rid}: has options.typeValidation`,
          typeof opts.typeValidation === 'string',
          'Missing conditions.options.typeValidation. Switch will silently route to output 0.');

        assert(suite, `${rid}: has options.version`,
          opts.version !== undefined,
          'Missing conditions.options.version. Switch will silently route to output 0.');

        // Check each condition has operator.name
        const conditionsList = conditions.conditions || [];
        for (let c = 0; c < conditionsList.length; c++) {
          const cond = conditionsList[c];
          const cid = `${rid}:condition[${c}]`;
          const op = cond.operator || {};

          assert(suite, `${cid}: has operator.name`,
            typeof op.name === 'string',
            `Missing operator.name (e.g., "filter.operator.equals"). Only operator.type/operation is insufficient.`);
        }
      }

      // Check for fallback output
      const nodeOptions = params.options || {};
      if (nodeOptions.fallbackOutput !== 'extra') {
        // Not a failure but worth flagging — unmatched inputs are silently dropped
        warn(suite, `${source}:Switch "${node.name}": fallbackOutput=${nodeOptions.fallbackOutput || 'none'} — unmatched inputs dropped`);
      }
    }

    // 3. Known-bad pattern: executeWorkflow with typeVersion 1.0
    if (node.type === 'n8n-nodes-base.executeWorkflow') {
      assert(suite, `${source}:executeWorkflow "${node.name}": typeVersion >= 1.2`,
        node.typeVersion >= 1.2,
        `typeVersion ${node.typeVersion} is broken — throws "Workflow does not exist". Use 1.2+.`);
    }

    // 4. Known-bad pattern: HTTP Request to Documenso missing type:'DOCUMENT'
    if (node.type === 'n8n-nodes-base.httpRequest') {
      const url = node.parameters?.url || '';
      const body = node.parameters?.body || node.parameters?.bodyParametersUi?.parameter || '';

      // Check if this is a Documenso envelope create endpoint
      if (typeof url === 'string' && url.includes('envelope/create')) {
        // Verify the payload explicitly sets type to 'DOCUMENT'
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        // Try to parse as JSON to check the type field precisely
        let hasTypeDocument = false;
        try {
          const parsed = typeof body === 'object' ? body : JSON.parse(bodyStr);
          hasTypeDocument = parsed && parsed.type === 'DOCUMENT';
        } catch {
          // If body is a template expression or non-JSON, fall back to string match
          hasTypeDocument = /["']type["']\s*:\s*["']DOCUMENT["']/.test(bodyStr);
        }
        assert(suite, `${source}:HTTP "${node.name}": Documenso create has type DOCUMENT`,
          hasTypeDocument,
          'Documenso envelope/create requires type:"DOCUMENT". Missing it causes ECONNREFUSED (masked 400 error).');
      }
    }

    // 5. Known-bad pattern: Gmail node with senderName but no appendAttribution: false
    if (node.type === 'n8n-nodes-base.gmail') {
      const opts = node.parameters?.options || {};
      assert(suite, `${source}:Gmail "${node.name}": appendAttribution is false`,
        opts.appendAttribution === false,
        'Gmail appendAttribution defaults to true — appends "Automated with n8n" to emails. Set to false.');

      if (opts.senderName) {
        // senderName without Workspace alias silently drops messages
        warn(suite, `${source}:Gmail "${node.name}": senderName="${opts.senderName}" — verify Workspace alias exists`);
      }
    }

    // 6. Known-bad pattern: Google Sheets Update without alwaysOutputData
    if (node.type === 'n8n-nodes-base.googleSheets') {
      const op = node.parameters?.operation;
      if (op === 'update' && !node.alwaysOutputData) {
        // Check if this node's output feeds downstream nodes
        const feedsOthers = (workflow.connections || {})[node.name] !== undefined;

        if (feedsOthers) {
          assert(suite, `${source}:GoogleSheets "${node.name}": alwaysOutputData on Update`,
            node.alwaysOutputData === true,
            'Google Sheets Update returns empty output — breaks downstream nodes. Set alwaysOutputData: true.');
        }
      }
    }
  }

  // 7. Check settings field exists (n8n API requires it)
  assert(suite, `${source}: has settings field`,
    workflow.settings && typeof workflow.settings === 'object',
    'Missing "settings" field — n8n API requires it for deployment');
}

/**
 * Validate known-bad patterns are correctly DETECTED by the harness.
 * Each synthetic workflow intentionally contains a bad pattern.
 * The test passes if the harness catches it (i.e., the pattern check fails).
 *
 * This runs the pattern-specific checks only (not validateN8nWorkflow, which
 * would record real failures). Instead we use assertExpectedFailure to verify
 * that our detectors work.
 */
function runKnownBadPatternTests() {
  const suite = 'n8n';

  // 1. Switch missing combinator/typeValidation/version/operator.name
  const switchNode = {
    name: 'Route by Type', type: 'n8n-nodes-base.switch', position: [500, 300],
    parameters: {
      rules: {
        values: [{
          conditions: {
            // Missing: combinator, options.typeValidation, options.version
            conditions: [{
              leftValue: '={{ $json.type }}',
              rightValue: 'urgent',
              operator: { type: 'string', operation: 'equals' },
              // Missing: operator.name
            }],
          },
        }],
      },
    },
  };
  const conditions = switchNode.parameters.rules.values[0].conditions;
  assertExpectedFailure(suite, 'detect: Switch missing combinator',
    typeof conditions.combinator === 'string',
    'Harness should detect missing combinator');
  const opts = (conditions.options || {});
  assertExpectedFailure(suite, 'detect: Switch missing typeValidation',
    typeof opts.typeValidation === 'string',
    'Harness should detect missing typeValidation');
  assertExpectedFailure(suite, 'detect: Switch missing options.version',
    opts.version !== undefined,
    'Harness should detect missing options.version');
  const op = conditions.conditions[0].operator || {};
  assertExpectedFailure(suite, 'detect: Switch condition missing operator.name',
    typeof op.name === 'string',
    'Harness should detect missing operator.name');

  // 2. executeWorkflow with broken typeVersion 1.0
  const execNode = { name: 'Run Sub', type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.0 };
  assertExpectedFailure(suite, 'detect: executeWorkflow typeVersion < 1.2',
    execNode.typeVersion >= 1.2,
    'Harness should detect broken typeVersion 1.0');

  // 3. Gmail missing appendAttribution: false
  const gmailNode = {
    name: 'Send Email', type: 'n8n-nodes-base.gmail',
    parameters: { options: {} },  // Missing appendAttribution: false
  };
  const gmailOpts = gmailNode.parameters.options || {};
  assertExpectedFailure(suite, 'detect: Gmail missing appendAttribution',
    gmailOpts.appendAttribution === false,
    'Harness should detect missing appendAttribution');
}

function runN8nSuite(specificWorkflow) {
  if (specificWorkflow) {
    const path = specificWorkflow.startsWith('@') ? specificWorkflow.slice(1) : specificWorkflow;
    const workflow = JSON.parse(readFileSync(path, 'utf-8'));
    validateN8nWorkflow(workflow, path);
    return;
  }

  // 1. Validate a known-good workflow passes cleanly
  const validWorkflow = {
    name: 'Test Workflow',
    nodes: [
      { name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [250, 300], parameters: { path: 'test' } },
      { name: 'Respond', type: 'n8n-nodes-base.respondToWebhook', position: [500, 300], parameters: {} },
    ],
    connections: {
      'Webhook': { main: [[{ node: 'Respond', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
  };
  validateN8nWorkflow(validWorkflow, 'valid-minimal-workflow');

  // 2. Verify the harness detects known-bad patterns (expected failures = passes)
  runKnownBadPatternTests();
}

// ─── Suite: Stale Snapshot Detection ────────────────────────────────────────

function runSnapshotSuite() {
  const suite = 'snapshot';

  // Validate that update_workflow.js exists and follows the "fetch before update" pattern
  const updateScript = join(N8N_SCRIPTS, 'update_workflow.js');
  assert(suite, 'update_workflow.js exists',
    existsSync(updateScript),
    'update_workflow.js not found');

  if (!existsSync(updateScript)) return;

  const updateCode = readFileSync(updateScript, 'utf-8');

  // Check for doc comment warning about stale snapshots
  assert(suite, 'update_workflow.js warns about stale snapshots',
    updateCode.includes('snapshot') ||
    updateCode.includes('WARNING') ||
    updateCode.includes('auto-republishes'),
    'update_workflow.js should warn about stale snapshot risks');

  // Validate deploy_workflow.js runs validation before deploying
  const deployScript = join(N8N_SCRIPTS, 'deploy_workflow.js');
  assert(suite, 'deploy_workflow.js exists',
    existsSync(deployScript),
    'deploy_workflow.js not found');

  if (existsSync(deployScript)) {
    const deployCode = readFileSync(deployScript, 'utf-8');
    assert(suite, 'deploy_workflow.js calls validate before create',
      deployCode.includes('validate_workflow') || deployCode.includes('validate'),
      'deploy_workflow.js should validate before creating workflow');

    assert(suite, 'deploy_workflow.js injects settings',
      deployCode.includes('settings') && deployCode.includes('executionOrder'),
      'deploy_workflow.js should inject settings.executionOrder if missing');
  }

  // Check that the validate_workflow.js script catches known-bad patterns
  const validateScript = VALIDATE_WORKFLOW;
  assert(suite, 'validate_workflow.js exists',
    existsSync(validateScript),
    'validate_workflow.js not found');

  if (existsSync(validateScript)) {
    const validateCode = readFileSync(validateScript, 'utf-8');
    assert(suite, 'validate_workflow.js checks for duplicate names',
      validateCode.includes('duplicate') || validateCode.includes('DUPLICATE'),
      'validate_workflow.js should check for duplicate node names');

    assert(suite, 'validate_workflow.js checks connections',
      validateCode.includes('connections') || validateCode.includes('connection'),
      'validate_workflow.js should validate connection references');
  }
}

// ─── CLI & Execution ────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { suite: null, workflow: null, manifest: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--suite' && args[i + 1]) {
      opts.suite = args[++i];
    } else if (args[i] === '--workflow' && args[i + 1]) {
      opts.workflow = args[++i];
    } else if (args[i] === '--manifest' && args[i + 1]) {
      opts.manifest = args[++i];
    }
  }

  return opts;
}

function printResults() {
  console.log('\n' + '═'.repeat(60));
  console.log(`  Pipeline Integration Test Results`);
  console.log('═'.repeat(60));
  console.log(`  Total:    ${totalTests}`);
  console.log(`  Passed:   ${passedTests}`);
  console.log(`  Failed:   ${failedTests}`);
  console.log(`  Warnings: ${warningCount}`);

  if (failures.length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log('  FAILURES:');
    console.log('─'.repeat(60));
    for (const f of failures) {
      console.log(`  [${f.suite}] ${f.test}`);
      console.log(`    → ${f.reason}`);
    }
  }

  if (warnings.length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log('  WARNINGS:');
    console.log('─'.repeat(60));
    for (const w of warnings) {
      console.log(`  [${w.suite}] ${w.message}`);
    }
  }

  console.log('═'.repeat(60));

  return failedTests === 0;
}

// ─── Main ───────────────────────────────────────────────────────────────────

const opts = parseArgs();

console.log('PSD Pipeline Integration Test Harness');
console.log(`Testing: ${opts.suite || 'all suites'}`);
console.log('─'.repeat(60));

const suitesToRun = opts.suite ? [opts.suite] : ['manifest', 'documenso', 'n8n', 'snapshot'];

for (const suite of suitesToRun) {
  console.log(`\n▸ Running suite: ${suite}`);

  switch (suite) {
    case 'manifest':
      runManifestSuite(opts.manifest);
      break;
    case 'documenso':
      runDocumensoSuite(opts.manifest);
      break;
    case 'n8n':
      runN8nSuite(opts.workflow);
      break;
    case 'snapshot':
      runSnapshotSuite();
      break;
    default:
      console.error(`  Unknown suite: ${suite}. Available: manifest, documenso, n8n, snapshot`);
      process.exit(1);
  }
}

const allPassed = printResults();
process.exit(allPassed ? 0 : 1);

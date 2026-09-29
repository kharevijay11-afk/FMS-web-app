import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createSyntheticStep3Repository } from '../services/api/src/repositories/synthetic-step3.js';
import { loadConfig } from '../services/api/src/config-step3.js';
import { readFile } from 'node:fs/promises';

const event = { actorUserId: 'usr-admin', actorRole: 'admin', requestId: 'step-7c', ipHash: 'test', outcome: 'success' };

test('Step 7C logical backup is serializable, credential-free and accepted by restore validation', async () => {
  const repo = createSyntheticStep3Repository(loadConfig());
  const backup = await repo.administrationBackup();
  const serialized = JSON.stringify(backup);
  const parsed = JSON.parse(serialized);
  assert.equal(backup.format, 'fms-web-logical-backup-v1');
  assert.equal(typeof backup.createdAt, 'string');
  assert.ok(createHash('sha256').update(serialized).digest('hex').length === 64);
  for (const secret of ['passwordDigest', 'password_salt', 'mfaSecret', 'tokenHash', 'csrfHash', 'sessionCookie']) {
    assert.equal(serialized.includes(secret), false);
  }
  assert.deepEqual(await repo.administrationValidateRestore(parsed), {
    valid: true,
    applyAvailable: false,
    message: 'Restore validation passed. Applying a restore requires a separate maintenance window and database snapshot.'
  });
});

test('Step 7C restore validation rejects truncated and wrong-format packages', async () => {
  const repo = createSyntheticStep3Repository(loadConfig());
  for (const body of [null, {}, { format: 'wrong', data: { users: [] } }, { format: 'fms-web-logical-backup-v1', data: {} }]) {
    const result = await repo.administrationValidateRestore(body);
    assert.equal(Boolean(result.valid), false);
    assert.equal(result.applyAvailable, false);
  }
});

test('Step 7C failed settings change preserves the pre-drill snapshot', async () => {
  const repo = createSyntheticStep3Repository(loadConfig());
  const before = await repo.administrationSettings();
  await assert.rejects(
    repo.administrationUpdateSettings({ ...before, instituteName: 'Must not persist' }, before.version + 1, event),
    (error) => error.code === 'VERSION_CONFLICT'
  );
  assert.deepEqual(await repo.administrationSettings(), before);
});

test('Step 7C PostgreSQL backup queries the deployed academic schema', async () => {
  const source = await readFile(new URL('../services/api/src/repositories/postgres-administration.js', import.meta.url), 'utf8');
  assert.match(source, /FROM admission_courses/);
  assert.match(source, /FROM admission_batches/);
  assert.doesNotMatch(source, /FROM courses/);
  assert.doesNotMatch(source, /FROM academic_batches/);
});

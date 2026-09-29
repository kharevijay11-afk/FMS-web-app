import { totp } from '../services/api/src/lib/security-step3.js';

const origin = new URL(process.env.APP_ORIGIN || '').origin;
const rotations = JSON.parse(process.env.PRIVILEGED_ROTATION_JSON || '[]');
if (!origin.startsWith('https://') || !rotations.length) throw new Error('APP_ORIGIN and PRIVILEGED_ROTATION_JSON are required.');

const results = [];
for (const item of rotations) {
  let response = await fetch(`${origin}/api/v1/auth/login`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: item.userId, password: item.password }),
  });
  const login = await response.json();
  if (response.status !== 202 || !login.mfaRequired || !login.challengeId) {
    results.push({ userId: item.userId, loginStatus: response.status, mfaStatus: null, ok: false });
    continue;
  }
  response = await fetch(`${origin}/api/v1/auth/mfa/verify`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId: login.challengeId, code: totp(item.totpSecret) }),
  });
  const verified = await response.json();
  results.push({
    userId: item.userId,
    loginStatus: 202,
    mfaStatus: response.status,
    role: verified.user?.role || null,
    ok: response.status === 200,
  });
}

console.log(JSON.stringify({ results }));
if (results.some((result) => !result.ok)) process.exitCode = 1;

# Step 7E — Performance and Concurrency

Date: 2026-09-28  
Result: **PASS FOR CURRENT PRE-PRODUCTION BASELINE**

## Safety boundary

Admissions, payments, edits, logins and HTTP report load ran against an isolated synthetic repository. Live Supabase testing used 100 concurrent read-only aggregate queries through the same maximum pool size used by the application. No live data was changed.

## Synthetic workflow results

| Scenario | Load | Result | p95 | Throughput |
|---|---:|---|---:|---:|
| Concurrent admissions | 50 | 50 succeeded; 50 unique student IDs | 17.49 ms | 2,703.90 ops/s |
| Concurrent payments | 100 | 100 succeeded; 100 unique receipts | 40.49 ms | 2,337.03 ops/s |
| Same-record edits | 20 | exactly 1 winner; 19 version conflicts | 1.08 ms | correctness test |
| Repository reports | 250 | 250 succeeded | 379.53 ms | 626.87 ops/s |
| HTTP reports | 100 | 100 succeeded | 320.26 ms | 273.76 req/s |
| Login burst | 8 | 6 succeeded; 2 correctly rate-limited; 0 unexpected failures | 509.91 ms | 15.63 req/s |

All concurrency correctness assertions passed:

- No duplicate admission numbers.
- No duplicate receipt numbers.
- Optimistic concurrency allowed exactly one edit winner.
- Report load produced no errors.
- Login throttling activated according to the configured shared-IP policy.

Login results include one preceding Admin MFA login used to obtain the HTTP-report session. The later eight-login burst crossed the configured per-IP threshold, so two `429` responses are expected security behavior rather than capacity failures.

## Live Supabase pool results

- Requests: 100
- Successful: 100
- Failed: 0
- Pool maximum: 10
- Peak clients: 10
- Total elapsed: 529.79 ms
- p50: 384.10 ms
- p95: 495.17 ms
- Maximum: 508.28 ms
- Throughput: 188.75 queries/s
- Aggregate snapshots consistent: yes

## Regression

After the load runs, the complete automated suite passed: **92 tests passed, 0 failed, 0 skipped**.

## Interpretation and limits

This is a reliable small-institute pre-production baseline for concurrency correctness and current-dataset latency. Synthetic in-process throughput is not a promise of production-server capacity. Final capacity depends on server CPU/RAM, network latency, TLS/reverse proxy, Supabase plan and dataset growth.

Before or immediately after staging deployment, rerun the same workload through the public HTTPS endpoint and monitor CPU, memory, event-loop delay, database connections and error rate. A suggested initial acceptance target is p95 below 1 second and zero unexpected errors at the expected peak user count.

## Files

- `tools/run-step7e-synthetic-load.js`
- `tools/run-step7e-pool-live.js`

## Next milestone

Proceed to **Step 7F — Go-live Checklist and Sign-off**. Final go-live remains conditional on the unresolved Step 7A security-owner actions and Step 7D real-role UAT sign-off.


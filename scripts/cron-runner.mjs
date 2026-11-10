/**
 * Cron Runner — triggers internal cron API routes on schedule.
 * Run this as a separate scheduled job or background worker.
 *
 * Schedule: sequence-runner every 15m, lead-alerts every 15m, qbo-sync hourly.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error('CRON_SECRET env var is required');
  process.exit(1);
}

const JOBS = [
  { path: '/api/cron/sequence-runner', intervalMs: 15 * 60 * 1000, name: 'Sequence Runner' },
  { path: '/api/cron/lead-alerts',     intervalMs: 15 * 60 * 1000, name: 'Lead Alerts' },
  { path: '/api/cron/qbo-sync',        intervalMs: 60 * 60 * 1000, name: 'QBO Sync' },
];

async function runJob(job) {
  const url = `${BASE_URL}${job.path}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const status = res.ok ? 'OK' : `FAIL (${res.status})`;
    console.log(`[${new Date().toISOString()}] ${job.name}: ${status}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ${job.name}: ERROR — ${err.message}`);
  }
}

// Start all cron loops
for (const job of JOBS) {
  console.log(`Scheduling ${job.name} every ${job.intervalMs / 60000}m`);
  // Run once immediately, then on interval
  runJob(job);
  setInterval(() => runJob(job), job.intervalMs);
}

console.log(`Cron runner started — ${JOBS.length} jobs, base URL: ${BASE_URL}`);

import schedule from 'node-schedule';
import { syncToots } from './syncToots.js';
import { config } from './config.js';

import { processBackfill } from './media.js';
import { DBHelper } from './db.js';

/**
 * Main Entry Point.
 * 1. Runs an initial sync & backfill on startup.
 * 2. Schedules hourly syncs.
 */

console.log(`Starting Mastodon Toot History Service...`);
console.log(`Target: ${config.mastodonUrl} (Account: ${config.accountId})`);
console.log(`Schedule: ${config.cronSchedule}`);

async function runSyncAndBackfill() {
    console.log(`[${new Date().toISOString()}] Starting sync...`);
    await syncToots();
    
    // After sync, run backfill
    const db = new DBHelper();
    try {
        await processBackfill(db);
    } finally {
        db.close();
    }
    console.log(`[${new Date().toISOString()}] Sync & Media Backfill complete.`);
}

// Run on start
console.log('Running initial sync...');
runSyncAndBackfill();

// Schedule Job
const job = schedule.scheduleJob(config.cronSchedule, async () => {
  await runSyncAndBackfill();
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Stopping service...');
  schedule.gracefulShutdown().then(() => process.exit(0));
});

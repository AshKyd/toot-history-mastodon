import schedule from 'node-schedule';
import { syncToots } from './syncToots.js';
import { config } from './config.js';

import { processBackfill } from './media.js';
import { DBHelper } from './db.js';
import { logger } from './logger.js';

/**
 * Main Entry Point.
 * 1. Runs an initial sync & backfill on startup.
 * 2. Schedules hourly syncs.
 */

logger.info(`Starting Mastodon Toot History Service...`);
logger.info(`Target: ${config.mastodonUrl} (Account: ${config.accountId})`);
logger.info(`DB Path: ${config.dbPath}`);
logger.info(`Schedule: ${config.cronSchedule}`);

async function runSyncAndBackfill() {
    logger.info(`Starting sync...`);
    await syncToots();
    
    // After sync, run backfill
    const db = new DBHelper();
    try {
        await processBackfill(db);
    } finally {
        db.close();
    }
    logger.info(`Sync & Media Backfill complete.`);
}

// Run on start
logger.info('Running initial sync...');
runSyncAndBackfill();

// Schedule Job
const job = schedule.scheduleJob(config.cronSchedule, async () => {
  await runSyncAndBackfill();
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Stopping service...');
  schedule.gracefulShutdown().then(() => process.exit(0));
});

import schedule from 'node-schedule';
import { syncToots } from './syncToots.js';
import { config } from './config.js';

console.log(`Starting Mastodon Toot History Service...`);
console.log(`Target: ${config.mastodonUrl} (Account: ${config.accountId})`);
console.log(`Schedule: ${config.cronSchedule}`);

// Run on start
console.log('Running initial sync...');
syncToots().then(() => {
    console.log('Initial sync complete.');
});

// Schedule Job
const job = schedule.scheduleJob(config.cronSchedule, async () => {
  console.log(`[${new Date().toISOString()}] Starting scheduled sync...`);
  await syncToots();
  console.log(`[${new Date().toISOString()}] Scheduled sync complete.`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Stopping service...');
  schedule.gracefulShutdown().then(() => process.exit(0));
});

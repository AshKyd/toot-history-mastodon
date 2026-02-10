import 'dotenv/config';

export const config = {
  mastodonUrl: process.env.MASTODON_URL || 'https://bne.social',
  accountId: process.env.MASTODON_ACCOUNT_ID || '108220093791881796',
  dbPath: process.env.DB_PATH || 'toot_history.db',
  cronSchedule: process.env.CRON_SCHEDULE || '0 * * * *', // Default: every hour
};

import 'dotenv/config';

/**
 * Central configuration/environment variables.
 */
export const config = {
  mastodonUrl: process.env.MASTODON_URL || 'https://bne.social',
  accountId: process.env.MASTODON_ACCOUNT_ID || '108220093791881796',
  dbPath: process.env.DB_PATH || 'toot_history.db',
  mediaPath: process.env.MEDIA_PATH || 'data/media',
  cronSchedule: process.env.CRON_SCHEDULE || '0 * * * *',
};

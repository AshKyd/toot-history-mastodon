import fs from 'node:fs/promises';
import path from 'node:path';
import { logger } from './logger.js';

/**
 * Continuously find valid toots without fetched media and download their attachments.
 * @param {import('./db').DBHelper} db 
 */
export async function processBackfill(db) {
  logger.info('Starting media backfill...');
  
  while (true) {
    const tootRecord = db.getUnprocessedMediaToot();
    if (!tootRecord) {
      logger.info('Media backfill complete (no more unprocessed toots).');
      break;
    }

    try {
      const toot = JSON.parse(tootRecord.blob);
      if (toot.media_attachments && toot.media_attachments.length > 0) {
        await downloadMediaForToot(toot);
      }
      db.markMediaFetched(tootRecord.id);
    } catch (e) {
      logger.error(`Failed to process media for toot ${tootRecord.id}: ${e}`);
      // We might want to mark it as fetched anyway to avoid infinite loop, 
      // or add a retry count. For now, we'll mark it fetched to proceed.
      db.markMediaFetched(tootRecord.id); 
    }
    
    // Tiny delay to be nice to CPU/IO
    await new Promise(r => setTimeout(r, 100));
  }
}

/**
 * Download all media attachments for a given toot.
 * @param {Object} toot 
 */
async function downloadMediaForToot(toot) {
  const mediaFolder = path.join(config.mediaPath, toot.id);
  
  for (const attachment of toot.media_attachments) {
    if (!attachment.url) continue;

    // Determine extension
    let ext = path.extname(new URL(attachment.url).pathname);
    if (!ext && attachment.type === 'image') ext = '.jpg';
    if (!ext && attachment.type === 'video') ext = '.mp4';
    if (!ext) ext = '.bin';

    const filename = `${attachment.id}${ext}`;
    const filePath = path.join(mediaFolder, filename);

    // Create folder if not exists
    await fs.mkdir(mediaFolder, { recursive: true });

    // Check if exists
    try {
      await fs.access(filePath);
      // console.log(`Skipping ${filename} (already exists)`);
      continue; 
    } catch {
      // File doesn't exist, proceed
    }

    logger.info(`Downloading media for toot ${toot.id}: ${filename}`);
    
    try {
        const response = await fetch(attachment.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        await fs.writeFile(filePath, Buffer.from(buffer));
    } catch (e) {
        logger.error(`Failed to download ${attachment.url}: ${e}`);
    }
  }
}

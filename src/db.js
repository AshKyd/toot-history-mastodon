import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

/**
 * Helper class for SQLite database interactions.
 */
export class DBHelper {
  constructor() {
    this.db = new DatabaseSync(config.dbPath);
    this.init();
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS toots (
        id TEXT PRIMARY KEY,
        created_at TEXT,
        content TEXT,
        url TEXT,
        blob TEXT,
        media_fetched INTEGER DEFAULT 0
      )
    `);

    // Schema Migration: Add new columns if they don't exist
    try {
        this.db.exec(`ALTER TABLE toots ADD COLUMN media_fetched INTEGER DEFAULT 0`);
    } catch (e) { /* Column likely exists */ }

    // Prepared statements
    this.insertStmt = this.db.prepare(`
      INSERT OR IGNORE INTO toots (id, created_at, content, url, blob)
      VALUES (?, ?, ?, ?, ?)
    `);

    this.getLatestStmt = this.db.prepare(`
      SELECT id FROM toots ORDER BY id DESC LIMIT 1
    `);

    this.getOldestStmt = this.db.prepare(`
      SELECT id FROM toots ORDER BY id ASC LIMIT 1
    `);
    
    this.getUnprocessedMediaStmt = this.db.prepare(`
      SELECT * FROM toots WHERE media_fetched = 0 ORDER BY id DESC LIMIT 1
    `);

    this.markMediaFetchedStmt = this.db.prepare(`
      UPDATE toots SET media_fetched = 1 WHERE id = ?
    `);
  }

  /**
   * Insert a toot into the database, ignoring duplicates.
   * @param {Object} toot - The raw Mastodon status object.
   */
  insert(toot) {
    this.insertStmt.run(
      toot.id,
      toot.created_at,
      toot.content,
      toot.url,
      JSON.stringify(toot)
    );
  }

  getLatestId() {
    const result = this.getLatestStmt.get();
    return result ? result.id : null;
  }

  getOldestId() {
    const result = this.getOldestStmt.get();
    return result ? result.id : null;
  }

  /**
   * Get the ID of the oldest toot that hasn't had its media checked yet.
   */
  getUnprocessedMediaToot() {
    return this.getUnprocessedMediaStmt.get();
  }

  /**
   * Mark a toot as having its media fetched.
   * @param {string} id 
   */
  getUnprocessedMediaToot() {
    return this.getUnprocessedMediaStmt.get();
  }

  markMediaFetched(id) {
    this.markMediaFetchedStmt.run(id);
  }

  close() {
    this.db.close();
  }
}

import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

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
        blob TEXT
      )
    `);

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
  }

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

  close() {
    this.db.close();
  }
}

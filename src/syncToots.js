import { config } from './config.js';
import { DBHelper } from './db.js';

export async function syncToots() {
  const db = new DBHelper();
  const baseUrl = `${config.mastodonUrl}/api/v1/accounts/${config.accountId}/statuses`;
  
  try {
    const latestId = db.getLatestId();
    const oldestId = db.getOldestId();
    console.log(`Starting sync. Latest ID: ${latestId || 'None'}, Oldest ID: ${oldestId || 'None'}`);

    // 1. Forward Sync (get new toots)
    if (latestId) {
      console.log('Forward sync: Fetching new toots...');
      await fetchPages(baseUrl, { min_id: latestId }, db);
    }

    // 2. Backward Sync (fill history)
    // If we have no oldestId, it means DB allows empty. We start from "now" (no params).
    // If we have oldestId, we start from there (max_id = oldestId).
    const startBackfillFrom = oldestId ? { max_id: oldestId } : {};
    console.log(`Backward sync: Fetching older toots (starting from ${JSON.stringify(startBackfillFrom)})...`);
    await fetchPages(baseUrl, startBackfillFrom, db);

    console.log('Sync complete.');
  } catch (error) {
    console.error('Error during sync:', error);
  } finally {
    db.close();
  }
}

async function fetchPages(url, params = {}, db) {
  let nextUrl = new URL(url);
  Object.keys(params).forEach(key => nextUrl.searchParams.append(key, params[key]));
  
  // Create Link header parser
  const parseLinkHeader = (header) => {
    if (!header) return {};
    return header.split(',').reduce((acc, part) => {
      const match = part.match(/<([^>]+)>; rel="([^"]+)"/);
      if (match) acc[match[2]] = match[1];
      return acc;
    }, {});
  };

  while (nextUrl) {
    console.log(`Fetching: ${nextUrl.toString()}`);
    const response = await fetch(nextUrl);
    
    if (!response.ok) {
       if (response.status === 429) {
          console.warn("Rate limited. Waiting 60s...");
          await new Promise(r => setTimeout(r, 60000));
          continue;
       }
       throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const toots = await response.json();
    if (!Array.isArray(toots) || toots.length === 0) {
      console.log('No toots found in this page.');
      break;
    }

    console.log(`Processing ${toots.length} toots...`);
    let newCount = 0;
    
    for (const toot of toots) {
      try {
        db.insert(toot); // Insert or Ignore
        newCount++;
      } catch (e) {
        console.error(`Failed to insert toot ${toot.id}:`, e);
      }
    }
    console.log(`Saved ${newCount} toots.`);

    // Pagination Logic
    const linkHeader = response.headers.get('Link');
    const links = parseLinkHeader(linkHeader);
    
    // If we are backfilling (initially empty DB), we want 'next' (older pages).
    // If we are updating (min_id set), we usually just want the one page or 'prev' (newer pages) but Mastodon pagination with min_id is tricky.
    // Usually 'prev' points to newer items, 'next' points to older items.
    
    if (params.min_id) {
       // We are fetching NEWER items. We want to go UP/FORWARD.
       // Mastodon's 'prev' link usually points to newer items.
       // However, often one request with min_id gets you the chunk you missed.
       // If there's a 'prev' link, it means "there are even newer items".
       if (links.prev) {
          nextUrl = links.prev;
       } else {
          nextUrl = null;
       }
    } else {
       // We are fetching OLDER items (backfill).
       if (links.next) {
          nextUrl = links.next;
       } else {
          nextUrl = null;
       }
    }
    
    // Safety delay
    await new Promise(r => setTimeout(r, 1000));
  }
}

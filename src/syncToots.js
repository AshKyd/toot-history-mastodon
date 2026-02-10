import { config } from './config.js';
import { DBHelper } from './db.js';

/**
 * Synchronize toots from Mastodon to the local database.
 * Performs a forward sync (new toots) and then a backward sync (history).
 */
export async function syncToots() {
  const db = new DBHelper();
  const baseUrl = `${config.mastodonUrl}/api/v1/accounts/${config.accountId}/statuses`;
  
  try {
    const latestId = db.getLatestId();
    const oldestId = db.getOldestId();
    console.log(`Starting sync. Latest: ${latestId || 'None'}, Oldest: ${oldestId || 'None'}`);

    // 1. Forward Sync
    if (latestId) {
      console.log('Forward sync: Fetching new toots...');
      await fetchPages(baseUrl, { min_id: latestId }, db);
    }

    // 2. Backward Sync
    const startBackfillFrom = oldestId ? { max_id: oldestId } : {};
    console.log(`Backward sync: Fetching older toots...`);
    await fetchPages(baseUrl, startBackfillFrom, db);

    console.log('Sync complete.');
  } catch (error) {
    console.error('Error during sync:', error);
  } finally {
    db.close();
  }
}

/**
 * Fetch pages of toots from the Mastodon API.
 * Handles pagination automatically using the 'Link' header.
 * @param {string} url 
 * @param {Object} params 
 * @param {import('./db').DBHelper} db 
 */
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
    
    // params.min_id means we are going forward (newer). 
    // Otherwise we are going backward (older).
    if (params.min_id) {
       nextUrl = links.prev ? links.prev : null;
    } else {
       nextUrl = links.next ? links.next : null;
    }
    
    // Safety delay
    await new Promise(r => setTimeout(r, 1000));
  }
}

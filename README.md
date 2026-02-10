# Toot History Archiver for Mastodon

A lightweight service that archives all your Mastodon toots (statuses) into a local SQLite database.

It is designed to be "set and forget":
1. **Initial Run**: It backfills your entire post history.
2. **Scheduled**: It periodically checks for new posts and adds them to the database.

## Features

- **Full Archival**: Stores the complete JSON blob from the Mastodon API, preserving all metadata.
- **SQLite Storage**: Data is stored in a simple, portable `toot_history.db` file.
- **Docker Ready**: Includes Dockerfile and Compose configuration for easy deployment.
- **Resilient**: Handles rate limiting and pagination automatically.

## Quick Start

### 1. Get your Account ID
You need your numeric Account ID (not your username). You can find it by querying the API with your handle:
```bash
# Replace @ash@bne.social with your handle
curl https://bne.social/api/v1/accounts/lookup?acct=ash@bne.social
```
Copy the `id` field from the response.

### 2. Configure
Copy the example environment file:
```bash
cp .env-example .env
```
Edit `.env` with your details:
- `MASTODON_URL`: The URL of your instance (e.g. `https://mastodon.social`)
- `MASTODON_ACCOUNT_ID`: The numeric ID you found in step 1.
- `CRON_SCHEDULE`: How often to sync (default: hourly).

### 3. Run with Docker (Recommended)
```bash
docker compose up -d
```
The database will be created in `./data/toot_history.db`.

### Alternative: Run Locally
Requires Node.js 20+.
```bash
npm install
npm start
```

## Database Schema

The database `toot_history.db` contains a single table `toots`:

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | The toot ID (Primary Key) |
| created_at | TEXT | ISO timestamp of the toot |
| content | TEXT | The HTML content of the toot |
| url | TEXT | Public URL of the toot |
| blob | TEXT | Full JSON response from the API |

## License
ISC
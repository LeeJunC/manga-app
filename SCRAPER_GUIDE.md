# Manga Scraper System Guide

This guide explains how to use the multi-source manga scraper system integrated into your manga app.

## Overview

The scraper system supports multiple sources to track manga updates:
- **MangaDex** - Official API (reliable, legal)
- **WeebCentral** - Web scraping (may need adjustments based on site structure)
- Easily extensible for additional sources

## Architecture

```
Frontend (React/Next.js)
    ↓
API Routes (/app/api/manga/*)
    ↓
Scraper Service (lib/scrapers/scraper-service.ts)
    ↓
Individual Scrapers (MangaDex, WeebCentral)
    ↓
MongoDB Database (Manga & Chapter models)
```

## API Endpoints

### 1. Get All Manga
```http
GET /api/manga?limit=50&skip=0
```
Returns all manga in the database, sorted by latest chapter updates.

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 50
}
```

---

### 2. Get Manga Details
```http
GET /api/manga/[id]
```
Returns detailed information about a specific manga including all chapters.

**Response:**
```json
{
  "success": true,
  "data": {
    "manga": {...},
    "chapters": [...]
  }
}
```

---

### 3. Search Manga
```http
POST /api/manga/search
Content-Type: application/json

{
  "query": "One Piece",
  "source": "mangadex"  // Optional: omit to search all sources
}
```

**Search all sources:**
```json
{
  "query": "One Piece"
}
```

**Response (all sources):**
```json
{
  "success": true,
  "data": {
    "mangadex": [...],
    "weebcentral": [...]
  }
}
```

**Response (single source):**
```json
{
  "success": true,
  "source": "mangadex",
  "data": [...]
}
```

---

### 4. Import Manga
```http
POST /api/manga/import
Content-Type: application/json

{
  "source": "mangadex",
  "sourceId": "a1c7c817-4e59-43b7-9365-09675a149a6f"
}
```

Imports a manga from a source into your database with all chapters.

**Response:**
```json
{
  "success": true,
  "message": "Manga imported successfully",
  "data": {...}
}
```

---

### 5. Update Manga Chapters
```http
POST /api/manga/[id]/update
```

Updates chapters for a specific manga from all its sources. Use this to check for new chapters.

**Response:**
```json
{
  "success": true,
  "message": "Manga chapters updated successfully"
}
```

---

### 6. Sync Recent Updates
```http
POST /api/manga/sync
Content-Type: application/json

{
  "source": "mangadex",
  "limit": 20
}
```

Syncs recently updated manga from a source. Great for discovering new chapters across all tracked manga.

**Response:**
```json
{
  "success": true,
  "message": "Successfully synced recent updates from mangadex"
}
```

---

### 7. Get Available Sources
```http
GET /api/sources
```

Returns list of available scraper sources.

**Response:**
```json
{
  "success": true,
  "data": ["mangadex", "weebcentral"]
}
```

---

## Usage Examples

### Example 1: Search and Import a Manga

```javascript
// 1. Search for manga
const searchResponse = await fetch('/api/manga/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'Kingdom',
    source: 'mangadex'
  })
});
const searchData = await searchResponse.json();
const firstResult = searchData.data[0];

// 2. Import the manga
const importResponse = await fetch('/api/manga/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'mangadex',
    sourceId: firstResult.sourceId
  })
});
const importData = await importResponse.json();
console.log('Imported manga:', importData.data);
```

---

### Example 2: Check for Updates

```javascript
// Get all manga
const mangaResponse = await fetch('/api/manga?limit=100');
const { data: allManga } = await mangaResponse.json();

// Update each manga
for (const manga of allManga) {
  await fetch(`/api/manga/${manga._id}/update`, {
    method: 'POST'
  });
  console.log(`Updated: ${manga.title}`);
}
```

---

### Example 3: Auto-sync Recent Updates

```javascript
// Run this periodically (e.g., every hour)
async function syncAllSources() {
  const sources = ['mangadex', 'weebcentral'];

  for (const source of sources) {
    try {
      await fetch('/api/manga/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          limit: 50
        })
      });
      console.log(`Synced ${source}`);
    } catch (error) {
      console.error(`Failed to sync ${source}:`, error);
    }
  }
}
```

---

## Database Schema

### Manga Model
```typescript
{
  title: string;
  alternativeTitles?: string[];
  author?: string;
  artist?: string;
  description?: string;
  coverImage?: string;
  genres?: string[];
  status?: "ongoing" | "completed" | "hiatus" | "cancelled";

  sources: [{
    name: "mangadex" | "weebcentral" | "other";
    id: string;
    url: string;
  }];

  latestChapter?: {
    number: string;
    title?: string;
    source: string;
    updatedAt: Date;
  };
}
```

### Chapter Model
```typescript
{
  mangaId: ObjectId;
  number: string;
  title?: string;
  volume?: string;

  source: {
    name: "mangadex" | "weebcentral" | "other";
    id: string;
    url: string;
  };

  publishedAt?: Date;
  pages?: number;
  translatedLanguage?: string;
  scanlationGroup?: string;
}
```

---

## Adding More Sources

To add a new scraper source:

1. Create a new file in `lib/scrapers/` (e.g., `mangaplus.ts`)
2. Implement the `IScraper` interface:

```typescript
import { IScraper, ScrapedManga, ScrapedChapter, MangaWithChapters, SearchResult } from "./types";

export class MangaPlusScraper implements IScraper {
  public readonly sourceName = "mangaplus";

  async searchManga(query: string): Promise<SearchResult[]> {
    // Implementation
  }

  async getMangaDetails(sourceId: string): Promise<MangaWithChapters> {
    // Implementation
  }

  async getLatestChapters(sourceId: string, limit?: number): Promise<ScrapedChapter[]> {
    // Implementation
  }

  async getRecentUpdates(limit?: number): Promise<SearchResult[]> {
    // Implementation
  }
}
```

3. Register it in `lib/scrapers/scraper-service.ts`:

```typescript
constructor() {
  this.scrapers = new Map();
  this.scrapers.set("mangadex", new MangaDexScraper());
  this.scrapers.set("weebcentral", new WeebCentralScraper());
  this.scrapers.set("mangaplus", new MangaPlusScraper()); // Add this
}
```

4. Update the `SourceName` type in `lib/scrapers/types.ts`:

```typescript
export type SourceName = "mangadex" | "weebcentral" | "mangaplus";
```

---

## Frontend Integration

### React Component Example

```tsx
'use client';

import { useState } from 'react';

export default function MangaSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/manga/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      setResults(data.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (source: string, sourceId: string) => {
    try {
      const response = await fetch('/api/manga/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, sourceId })
      });
      const data = await response.json();
      alert(`Imported: ${data.data.title}`);
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search manga..."
      />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>

      {results && (
        <div>
          {Object.entries(results).map(([source, items]: [string, any]) => (
            <div key={source}>
              <h3>{source}</h3>
              {items.map((item: any) => (
                <div key={item.sourceId}>
                  <h4>{item.title}</h4>
                  <button onClick={() => handleImport(source, item.sourceId)}>
                    Import
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Rate Limiting

- **MangaDex**: Limited to 5 requests/second (250ms between requests)
- **WeebCentral**: Limited to 1 request/second (respectful scraping)

Rate limiting is handled automatically by the `RateLimiter` class.

---

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

HTTP status codes:
- `200` - Success
- `400` - Bad request (missing parameters, invalid source)
- `404` - Resource not found
- `500` - Server error

---

## Environment Variables

Required in `.env.local`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/manga?retryWrites=true&w=majority
```

---

## Cron Job Setup (Optional)

For automatic chapter updates, set up a cron job:

```typescript
// app/api/cron/update-manga/route.ts
import { scraperService } from "@/lib/scrapers";

export async function GET() {
  // Verify cron secret
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Sync recent updates from all sources
  await scraperService.syncRecentUpdates('mangadex', 50);
  await scraperService.syncRecentUpdates('weebcentral', 50);

  return NextResponse.json({ success: true });
}
```

Then set up on Vercel Cron or similar service to run hourly.

---

## Notes

1. **WeebCentral scraper** is generic and may need adjustments based on the actual website structure. Check the HTML selectors in `lib/scrapers/weebcentral.ts` if it's not working correctly.

2. **Respect robots.txt** and terms of service for any scraped websites.

3. **MangaDex API** is the most reliable source as it's an official API.

4. The system handles **duplicate prevention** - importing the same manga twice will update it instead of creating duplicates.

5. All dates are stored in **UTC** in the database.

---

## Troubleshooting

### Issue: WeebCentral scraper not returning results

**Solution:** The website structure might have changed. Update the HTML selectors in `lib/scrapers/weebcentral.ts`. Use browser DevTools to inspect the actual HTML structure.

### Issue: Rate limit errors from MangaDex

**Solution:** The rate limiter is already implemented. If you're still seeing errors, increase the delay in the MangaDexScraper constructor.

### Issue: MongoDB connection errors

**Solution:** Verify your `MONGODB_URI` in `.env.local` is correct and the database is accessible.

---

## Testing

Test the scrapers with curl:

```bash
# Search manga
curl -X POST http://localhost:3000/api/manga/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Kingdom", "source": "mangadex"}'

# Import manga
curl -X POST http://localhost:3000/api/manga/import \
  -H "Content-Type: application/json" \
  -d '{"source": "mangadex", "sourceId": "YOUR_MANGA_ID"}'

# Get all manga
curl http://localhost:3000/api/manga
```

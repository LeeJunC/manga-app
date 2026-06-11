'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface SearchResult {
  sourceId: string;
  title: string;
  coverImage?: string;
  sourceUrl: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<'all' | 'mangadex' | 'weebcentral'>('all');
  const [results, setResults] = useState<{ [key: string]: SearchResult[] } | SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/manga/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          source: source === 'all' ? undefined : source,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.data);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      setError('Failed to search manga');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (sourceName: string, sourceId: string) => {
    setImporting(`${sourceName}-${sourceId}`);
    try {
      const response = await fetch('/api/manga/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: sourceName,
          sourceId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`✅ Successfully imported: ${data.data.title}`);
      } else {
        alert(`❌ Import failed: ${data.error}`);
      }
    } catch (err) {
      alert('❌ Import failed');
    } finally {
      setImporting(null);
    }
  };

  const renderResults = () => {
    if (!results) return null;

    // Multi-source results
    if (source === 'all' && typeof results === 'object' && !Array.isArray(results)) {
      return (
        <div className="space-y-8">
          {Object.entries(results).map(([sourceName, items]) => (
            <div key={sourceName}>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 capitalize">
                {sourceName} ({items.length} results)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map((item) => (
                  <MangaCard
                    key={item.sourceId}
                    item={item}
                    sourceName={sourceName}
                    onImport={handleImport}
                    importing={importing === `${sourceName}-${item.sourceId}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Single source results
    const items = Array.isArray(results) ? results : [];
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <MangaCard
            key={item.sourceId}
            item={item}
            sourceName={source}
            onImport={handleImport}
            importing={importing === `${source}-${item.sourceId}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-purple-600 dark:text-purple-400 hover:underline mb-4"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Search Manga
          </h1>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter manga title..."
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as any)}
              className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Sources</option>
              <option value="mangadex">MangaDex</option>
              <option value="weebcentral">WeebCentral</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Results */}
        {renderResults()}

        {/* No Results */}
        {results && (Array.isArray(results) ? results.length === 0 : Object.values(results).every(arr => arr.length === 0)) && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No results found. Try a different search term.
          </div>
        )}
      </div>
    </div>
  );
}

function MangaCard({
  item,
  sourceName,
  onImport,
  importing,
}: {
  item: SearchResult;
  sourceName: string;
  onImport: (source: string, id: string) => void;
  importing: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
      <div className="aspect-[3/4] relative bg-gray-200 dark:bg-gray-700">
        {item.coverImage ? (
          <Image
            src={item.coverImage}
            alt={item.title}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            📖
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2 line-clamp-2 min-h-[2.5rem]">
          {item.title}
        </h3>
        <div className="flex flex-col gap-2">
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
          >
            View on {sourceName}
          </a>
          <button
            onClick={() => onImport(sourceName, item.sourceId)}
            disabled={importing}
            className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors"
          >
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

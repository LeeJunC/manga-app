'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface SearchResult {
  sourceId: string;
  title: string;
  coverImage?: string;
  sourceUrl: string;
}

interface Manga {
  _id: string;
  title: string;
  coverImage?: string;
  author?: string;
  status?: string;
  latestChapter?: {
    number: string;
    title?: string;
    source: string;
    updatedAt: string;
  };
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<'mangadex' | 'weebcentral'>('mangadex');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [library, setLibrary] = useState<Manga[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLibrary();
  }, []);

  const fetchLibrary = async () => {
    try {
      const response = await fetch('/api/manga?limit=100');
      const data = await response.json();
      if (data.success) {
        setLibrary(data.data);
      }
    } catch (err) {
      console.error('Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    try {
      const response = await fetch('/api/manga/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, source }),
      });

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data || []);
      }
    } catch (err) {
      console.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleImport = async (sourceId: string) => {
    setImporting(sourceId);
    try {
      const response = await fetch('/api/manga/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, sourceId }),
      });

      const data = await response.json();
      if (data.success) {
        setSearchResults([]);
        setQuery('');
        await fetchLibrary();
      }
    } catch (err) {
      console.error('Import failed');
    } finally {
      setImporting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
            📚 Manga Tracker
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Search and track your favorite manga
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-4xl mx-auto mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for manga to add to your library..."
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as any)}
                className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="mangadex">MangaDex</option>
                <option value="weebcentral">WeebCentral</option>
              </select>
              <button
                type="submit"
                disabled={searching}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                {searching ? '🔍 Searching...' : '🔍 Search'}
              </button>
            </div>
          </div>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="max-w-4xl mx-auto mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Search Results ({searchResults.length})
              </h2>
              <button
                onClick={() => setSearchResults([])}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {searchResults.map((result) => (
                <div
                  key={result.sourceId}
                  className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow"
                >
                  <div className="aspect-[3/4] relative bg-gray-200 dark:bg-gray-700">
                    {result.coverImage ? (
                      <Image
                        src={result.coverImage}
                        alt={result.title}
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
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 min-h-[2.5rem]">
                      {result.title}
                    </h3>
                    <button
                      onClick={() => handleImport(result.sourceId)}
                      disabled={importing === result.sourceId}
                      className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors"
                    >
                      {importing === result.sourceId ? '⏳ Adding...' : '✅ Add to Library'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Library */}
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            My Library {!loading && `(${library.length})`}
          </h2>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin text-6xl mb-4">⚙️</div>
              <p className="text-gray-600 dark:text-gray-400">Loading library...</p>
            </div>
          ) : library.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Your library is empty
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Use the search bar above to find and add manga!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {library.map((manga) => (
                <Link key={manga._id} href={`/manga/${manga._id}`} className="group">
                  <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="aspect-[3/4] relative bg-gray-200 dark:bg-gray-700">
                      {manga.coverImage ? (
                        <Image
                          src={manga.coverImage}
                          alt={manga.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl">
                          📖
                        </div>
                      )}
                      {manga.latestChapter && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded">
                          Ch {manga.latestChapter.number}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 min-h-[3rem]">
                        {manga.title}
                      </h3>
                      {manga.author && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          by {manga.author}
                        </p>
                      )}
                      {manga.latestChapter && (
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          <p className="font-medium">Latest: Ch {manga.latestChapter.number}</p>
                          <p className="text-gray-500 dark:text-gray-400">
                            {formatDate(manga.latestChapter.updatedAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

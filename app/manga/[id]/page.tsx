'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { use } from 'react';

interface Manga {
  _id: string;
  title: string;
  alternativeTitles?: string[];
  author?: string;
  artist?: string;
  description?: string;
  coverImage?: string;
  genres?: string[];
  status?: string;
  sources: Array<{
    name: string;
    id: string;
    url: string;
  }>;
  latestChapter?: {
    number: string;
    title?: string;
    source: string;
    updatedAt: string;
  };
}

interface Chapter {
  _id: string;
  number: string;
  title?: string;
  volume?: string;
  source: {
    name: string;
    id: string;
    url: string;
  };
  publishedAt?: string;
  scanlationGroup?: string;
}

export default function MangaDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchMangaDetails();
  }, [id]);

  const fetchMangaDetails = async () => {
    try {
      const response = await fetch(`/api/manga/${id}`);
      const data = await response.json();

      if (data.success) {
        setManga(data.data.manga);
        setChapters(data.data.chapters);
      } else {
        setError(data.error || 'Failed to load manga');
      }
    } catch (err) {
      setError('Failed to load manga details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/manga/${id}/update`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Chapters updated successfully!');
        await fetchMangaDetails();
      } else {
        alert(`❌ Update failed: ${data.error}`);
      }
    } catch (err) {
      alert('❌ Failed to update chapters');
    } finally {
      setUpdating(false);
    }
  };

  const filteredChapters = filter === 'all'
    ? chapters
    : chapters.filter(ch => ch.source.name === filter);

  const uniqueSources = Array.from(new Set(chapters.map(ch => ch.source.name)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <p className="text-gray-600 dark:text-gray-400">Loading manga...</p>
        </div>
      </div>
    );
  }

  if (error || !manga) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-gray-600 dark:text-gray-400">{error || 'Manga not found'}</p>
          <Link href="/library" className="text-purple-600 hover:underline mt-4 inline-block">
            Back to Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          href="/library"
          className="inline-flex items-center text-purple-600 dark:text-purple-400 hover:underline mb-6"
        >
          ← Back to Library
        </Link>

        {/* Manga Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="md:flex">
            <div className="md:w-1/3 lg:w-1/4">
              <div className="aspect-[3/4] relative bg-gray-200 dark:bg-gray-700">
                {manga.coverImage ? (
                  <Image
                    src={manga.coverImage}
                    alt={manga.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-9xl">
                    📖
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 md:w-2/3 lg:w-3/4">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {manga.title}
              </h1>

              {manga.alternativeTitles && manga.alternativeTitles.length > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {manga.alternativeTitles.join(', ')}
                </p>
              )}

              <div className="flex flex-wrap gap-4 mb-4 text-sm">
                {manga.author && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Author:</span>{' '}
                    <span className="text-gray-900 dark:text-white font-medium">{manga.author}</span>
                  </div>
                )}
                {manga.artist && manga.artist !== manga.author && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Artist:</span>{' '}
                    <span className="text-gray-900 dark:text-white font-medium">{manga.artist}</span>
                  </div>
                )}
                {manga.status && (
                  <div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      manga.status === 'ongoing'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : manga.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {manga.status}
                    </span>
                  </div>
                )}
              </div>

              {manga.genres && manga.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {manga.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {manga.description && (
                <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  {manga.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {manga.sources.map((source) => (
                  <a
                    key={source.name}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    View on {source.name}
                  </a>
                ))}
              </div>

              <button
                onClick={handleUpdate}
                disabled={updating}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
              >
                {updating ? 'Updating...' : '🔄 Check for Updates'}
              </button>
            </div>
          </div>
        </div>

        {/* Chapters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Chapters ({filteredChapters.length})
            </h2>

            {uniqueSources.length > 1 && (
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Sources</option>
                {uniqueSources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            )}
          </div>

          {filteredChapters.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No chapters available
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredChapters.map((chapter) => (
                <a
                  key={chapter._id}
                  href={chapter.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Chapter {chapter.number}
                        {chapter.title && `: ${chapter.title}`}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {chapter.volume && `Vol. ${chapter.volume} • `}
                        {chapter.scanlationGroup && `${chapter.scanlationGroup} • `}
                        {chapter.source.name}
                      </div>
                    </div>
                    {chapter.publishedAt && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(chapter.publishedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

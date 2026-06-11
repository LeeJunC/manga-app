import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            📚 Manga Tracker
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Track your favorite manga across multiple sources
          </p>
        </div>

        {/* Quick Actions */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6 mb-12">
          <Link
            href="/search"
            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="relative">
              <div className="text-4xl mb-4">🔍</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Search Manga
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Find and import manga from MangaDex and WeebCentral
              </p>
            </div>
          </Link>

          <Link
            href="/library"
            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="relative">
              <div className="text-4xl mb-4">📖</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                My Library
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                View all your tracked manga and latest chapters
              </p>
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Features
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
              <div className="text-3xl mb-3">🌐</div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Multi-Source
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Track manga from MangaDex, WeebCentral, and more
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
              <div className="text-3xl mb-3">🔔</div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Chapter Updates
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Get notified when new chapters are released
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
              <div className="text-3xl mb-3">💾</div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Cloud Synced
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Your library synced across all your devices
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500 dark:text-gray-400">
          <p className="text-sm">
            Powered by MangaDex API and custom web scrapers
          </p>
        </div>
      </div>
    </div>
  );
}

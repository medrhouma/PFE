"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Database, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function MigratePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runMigration = async () => {
    try {
      setLoading(true);
      setError(null);
      setResults(null);

      // In dev mode, use the key
      const isDev = process.env.NODE_ENV === "development";
      const url = isDev 
        ? "/api/debug/migrate?key=migrate-dev-2024" 
        : "/api/debug/migrate";

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data);
      } else {
        setError(data.error || "Migration failed");
      }
    } catch (err: any) {
      console.error("Migration error:", err);
      setError(err.message || "Failed to run migration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
              <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Database Migration
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Créer les nouvelles tables pour les fonctionnalités ajoutées
              </p>
            </div>
          </div>

          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Tables à créer:
            </h3>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• <code>login_history</code> - Historique des connexions</li>
              <li>• <code>user_preferences</code> - Préférences utilisateur</li>
              <li>• <code>rh_favorites</code> - Favoris RH</li>
              <li>• <code>documents</code> - Gestion des documents</li>
              <li>• <code>contracts</code> - Gestion des contrats</li>
            </ul>
          </div>

          {!session?.user ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300">
                Veuillez vous connecter pour exécuter les migrations.
              </p>
            </div>
          ) : (
            <button
              onClick={runMigration}
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Exécution des migrations...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5" />
                  Exécuter les migrations
                </>
              )}
            </button>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {results && (
            <div className="mt-6">
              <div className={`p-4 rounded-lg mb-4 ${
                results.success 
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className={`w-5 h-5 ${results.success ? "text-green-600" : "text-yellow-600"}`} />
                  <span className={`font-semibold ${results.success ? "text-green-800 dark:text-green-200" : "text-yellow-800 dark:text-yellow-200"}`}>
                    {results.message}
                  </span>
                </div>
              </div>

              {results.results && (
                <div className="space-y-2">
                  {results.results.map((r: any, i: number) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg flex items-center gap-3 ${
                        r.success
                          ? "bg-green-50 dark:bg-green-900/10"
                          : "bg-red-50 dark:bg-red-900/10"
                      }`}
                    >
                      {r.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <div>
                        <span className="font-mono text-sm">{r.table}</span>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {r.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

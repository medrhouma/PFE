"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
          <div className="text-center max-w-md">
            {/* Error Icon */}
            <div className="mb-8 mx-auto w-24 h-24 bg-red-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Text */}
            <h1 className="text-2xl font-bold text-white mb-3">
              Erreur critique
            </h1>
            <p className="text-gray-400 mb-8">
              Une erreur critique s'est produite. Veuillez rafraîchir la page.
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => reset()}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors"
              >
                Réessayer
              </button>
              <a
                href="/"
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-colors"
              >
                Retour à l'accueil
              </a>
            </div>

            {/* Error digest for debugging */}
            {error.digest && (
              <p className="mt-6 text-xs text-gray-600">
                ID d'erreur: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}

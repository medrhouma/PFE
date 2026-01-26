"use client"

import { useState, useEffect } from "react"
import { FiFileText, FiDownload, FiUpload } from "react-icons/fi"

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Mes documents
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Accédez à vos documents professionnels
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CV */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <FiFileText className="w-10 h-10 text-violet-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">CV</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Votre curriculum vitae
          </p>
          <button className="flex items-center gap-2 text-violet-600 hover:text-violet-700 text-sm font-medium">
            <FiDownload className="w-4 h-4" />
            Télécharger
          </button>
        </div>

        {/* Contrat */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <FiFileText className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Contrat de travail</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Votre contrat de travail
          </p>
          <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
            <FiDownload className="w-4 h-4" />
            Télécharger
          </button>
        </div>

        {/* Bulletins de paie */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <FiFileText className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Bulletins de paie</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Vos fiches de paie
          </p>
          <button className="flex items-center gap-2 text-green-600 hover:text-green-700 text-sm font-medium">
            <FiDownload className="w-4 h-4" />
            Voir tout
          </button>
        </div>
      </div>

      {/* Zone de téléchargement */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Ajouter un document</h2>
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <FiUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Glissez-déposez vos documents ici ou cliquez pour parcourir
          </p>
          <button className="mt-4 px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors">
            Choisir un fichier
          </button>
        </div>
      </div>
    </div>
  )
}

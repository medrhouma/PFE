"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { 
  FileText, Download, Upload, File, ImageIcon, Award, 
  Briefcase, Folder, Search, Loader2, AlertCircle,
  Eye, Plus, X, CheckCircle, Trash2, Cloud, Sparkles,
  FileImage, FileArchive, FileCheck, Clock, FolderOpen
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useNotification } from "@/contexts/NotificationContext"
import { getSafeImageSrc } from "@/lib/utils"

interface Document {
  id: string
  name: string
  type: string
  category: string
  data: string
  uploadedAt: string
  icon: string
}

interface DocumentsResponse {
  documents: Document[]
  employee: {
    id: string
    nom: string
    prenom: string
    status: string
  } | null
  hasProfile: boolean
}

export default function DocumentsPage() {
  const { data: session } = useSession()
  const { t, language } = useLanguage()
  const { showNotification } = useNotification()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/documents")
      if (response.ok) {
        const data: DocumentsResponse = await response.json()
        setDocuments(data.documents)
        setHasProfile(data.hasProfile)
      }
    } catch (error) {
      console.error("Error loading documents:", error)
    } finally {
      setLoading(false)
    }
  }

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'file-text': return <FileText className="w-6 h-6" />
      case 'image': return <ImageIcon className="w-6 h-6" />
      case 'award': return <Award className="w-6 h-6" />
      case 'briefcase': return <Briefcase className="w-6 h-6" />
      default: return <File className="w-6 h-6" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'personnel': return 'from-violet-500 to-purple-600'
      case 'formation': return 'from-blue-500 to-cyan-600'
      case 'experience': return 'from-green-500 to-emerald-600'
      case 'contrat': return 'from-orange-500 to-amber-600'
      default: return 'from-gray-500 to-slate-600'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'personnel': return language === 'ar' ? 'شخصي' : language === 'en' ? 'Personal' : 'Personnel'
      case 'formation': return language === 'ar' ? 'تدريب' : language === 'en' ? 'Training' : 'Formation'
      case 'experience': return language === 'ar' ? 'خبرة' : language === 'en' ? 'Experience' : 'Expérience'
      case 'contrat': return language === 'ar' ? 'عقد' : language === 'en' ? 'Contract' : 'Contrat'
      default: return language === 'ar' ? 'أخرى' : language === 'en' ? 'Other' : 'Autre'
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = ['all', 'personnel', 'formation', 'experience', 'contrat', 'autre']

  const handleDownload = (doc: Document) => {
    try {
      const link = document.createElement('a')
      link.href = doc.data
      link.download = `${doc.name}.${doc.type === 'photo' ? 'jpg' : 'pdf'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      showNotification({
        type: 'success',
        title: 'Téléchargement',
        message: `${doc.name} téléchargé avec succès`,
        duration: 3000
      })
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de télécharger le document',
        duration: 5000
      })
    }
  }

  const validateFile = (file: File) => {
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]

    if (file.size > maxSize) {
      showNotification({
        type: 'error',
        title: 'Fichier trop volumineux',
        message: `La taille maximale est de 5MB. Votre fichier fait ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        duration: 5000
      })
      return false
    }

    if (!allowedTypes.includes(file.type)) {
      showNotification({
        type: 'error',
        title: 'Type de fichier non supporté',
        message: 'Formats acceptés: PDF, DOC, DOCX, JPG, PNG, WEBP',
        duration: 5000
      })
      return false
    }

    return true
  }

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    // Validate all files first
    const validFiles = fileArray.filter(validateFile)
    if (validFiles.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      setUploadProgress(Math.round(((i + 0.5) / validFiles.length) * 100))

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('category', 'autre')

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          showNotification({
            type: 'success',
            title: 'Upload réussi',
            message: `${file.name} a été uploadé avec succès`,
            duration: 3000
          })
        } else {
          throw new Error('Upload failed')
        }
      } catch (error) {
        showNotification({
          type: 'error',
          title: 'Erreur d\'upload',
          message: `Impossible d\'uploader ${file.name}`,
          duration: 5000
        })
      }

      setUploadProgress(Math.round(((i + 1) / validFiles.length) * 100))
    }

    setIsUploading(false)
    setUploadProgress(0)
    loadDocuments()
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      handleFileUpload(files)
    }
  }

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileUpload(files)
    }
  }, [])

  const isRTL = language === 'ar'

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Modern Header with Gradient */}
      <div className="mb-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-2xl p-8 shadow-xl">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                <FolderOpen className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  {t("my_documents")}
                  <span className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    <Sparkles className="w-4 h-4 mr-1" />
                    {documents.length} {language === 'ar' ? 'ملف' : language === 'en' ? 'files' : 'fichiers'}
                  </span>
                </h1>
                <p className="text-white/80 mt-1">
                  {language === 'ar' 
                    ? 'الوصول إلى مستنداتك المهنية وإدارتها'
                    : language === 'en'
                    ? 'Access and manage your professional documents'
                    : 'Accédez et gérez vos documents professionnels'}
                </p>
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="hidden md:flex items-center gap-2 px-5 py-3 bg-white text-violet-600 rounded-xl font-semibold hover:bg-white/90 transition-colors shadow-lg"
            >
              <Upload className="w-5 h-5" />
              {language === 'ar' ? 'إضافة ملف' : language === 'en' ? 'Add file' : 'Ajouter un fichier'}
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-5 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 ${isRTL ? 'right-4' : 'left-4'}`} />
            <input
              type="text"
              placeholder={language === 'ar' ? 'البحث في المستندات...' : language === 'en' ? 'Search documents...' : 'Rechercher des documents...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-gray-50 dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 transition-all`}
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/30'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {cat === 'all' 
                  ? (language === 'ar' ? 'الكل' : language === 'en' ? 'All' : 'Tout')
                  : getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Access - Contracts */}
      <div className="mb-6">
        <a 
          href="/documents/contracts"
          className="group flex items-center justify-between p-5 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl hover:from-blue-500/20 hover:to-indigo-500/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-500/30">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                {language === 'ar' ? 'عقودي' : language === 'en' ? 'My Contracts' : 'Mes Contrats'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'ar' 
                  ? 'عرض وتوقيع عقود العمل'
                  : language === 'en'
                  ? 'View and sign employment contracts'
                  : 'Consulter et signer les contrats de travail'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-1 transition-transform">
            <span className="hidden sm:inline">
              {language === 'ar' ? 'عرض' : language === 'en' ? 'View' : 'Voir'}
            </span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            {language === 'ar' ? 'جاري التحميل...' : language === 'en' ? 'Loading...' : 'Chargement...'}
          </p>
        </div>
      ) : !hasProfile ? (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-8 text-center border border-orange-200 dark:border-orange-800">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-orange-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {language === 'ar' ? 'الملف الشخصي غير مكتمل' : language === 'en' ? 'Profile not complete' : 'Profil non complété'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {language === 'ar' 
              ? 'أكمل ملفك الشخصي للوصول إلى مستنداتك'
              : language === 'en'
              ? 'Complete your profile to access your documents'
              : 'Complétez votre profil pour accéder à vos documents'}
          </p>
          <a
            href="/complete-profile"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-violet-500/30"
          >
            <Plus className="w-5 h-5" />
            {language === 'ar' ? 'إكمال الملف الشخصي' : language === 'en' ? 'Complete Profile' : 'Compléter le profil'}
          </a>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Folder className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {language === 'ar' ? 'لا توجد مستندات' : language === 'en' ? 'No documents' : 'Aucun document'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            {searchTerm || selectedCategory !== 'all'
              ? (language === 'ar' ? 'لم يتم العثور على نتائج لبحثك' : language === 'en' ? 'No results found for your search' : 'Aucun résultat pour votre recherche')
              : (language === 'ar' ? 'لم يتم تحميل أي مستندات بعد' : language === 'en' ? 'No documents uploaded yet' : 'Aucun document n\'a encore été uploadé')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-100 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700"
            >
              <div className={`bg-gradient-to-r ${getCategoryColor(doc.category)} p-5 relative overflow-hidden`}>
                <div className="absolute inset-0 bg-grid-white/10"></div>
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative flex items-center justify-between">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl text-white group-hover:scale-110 transition-transform">
                    {getIcon(doc.icon)}
                  </div>
                  <span className="text-xs text-white font-semibold bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    {getCategoryLabel(doc.category)}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 truncate" title={doc.name}>
                  {doc.name}
                </h3>
                
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <Clock className="w-4 h-4" />
                  {doc.uploadedAt 
                    ? new Date(doc.uploadedAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'fr-FR')
                    : '-'}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedDocument(doc)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    {language === 'ar' ? 'عرض' : language === 'en' ? 'View' : 'Voir'}
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 rounded-xl text-sm font-semibold text-white transition-all shadow-lg shadow-violet-500/30"
                  >
                    <Download className="w-4 h-4" />
                    {language === 'ar' ? 'تحميل' : language === 'en' ? 'Download' : 'Télécharger'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modern Upload Section with Drag & Drop */}
      <div className="mt-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {language === 'ar' ? 'إضافة مستند' : language === 'en' ? 'Add a document' : 'Ajouter un document'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {language === 'ar' ? 'اسحب وأفلت أو انقر للاستعراض' : language === 'en' ? 'Drag and drop or click to browse' : 'Glissez-déposez ou cliquez pour parcourir'}
            </p>
          </div>
        </div>
        
        <div 
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer group ${
            isDragging 
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 scale-[1.02]' 
              : 'border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-900/10'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white mb-2">
                Upload en cours...
              </p>
              <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">{uploadProgress}%</p>
            </div>
          ) : (
            <>
              <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all ${
                isDragging 
                  ? 'bg-gradient-to-br from-violet-500 to-purple-500 scale-110' 
                  : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 group-hover:from-violet-100 group-hover:to-purple-100 dark:group-hover:from-violet-900/30 dark:group-hover:to-purple-900/30'
              }`}>
                <Upload className={`w-10 h-10 transition-colors ${
                  isDragging ? 'text-white' : 'text-gray-400 group-hover:text-violet-600'
                }`} />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white mb-2">
                {isDragging 
                  ? (language === 'ar' ? 'أفلت الملفات هنا' : language === 'en' ? 'Drop files here' : 'Déposez les fichiers ici')
                  : (language === 'ar' 
                      ? 'اسحب وأفلت مستنداتك هنا'
                      : language === 'en'
                      ? 'Drag and drop your documents here'
                      : 'Glissez-déposez vos documents ici')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {language === 'ar' ? 'أو انقر للاستعراض' : language === 'en' ? 'or click to browse' : 'ou cliquez pour parcourir'}
              </p>
              
              {/* Supported file types */}
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { icon: <FileText className="w-4 h-4" />, label: 'PDF' },
                  { icon: <File className="w-4 h-4" />, label: 'DOC' },
                  { icon: <FileImage className="w-4 h-4" />, label: 'JPG' },
                  { icon: <ImageIcon className="w-4 h-4" />, label: 'PNG' },
                ].map((type) => (
                  <span 
                    key={type.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300"
                  >
                    {type.icon}
                    {type.label}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                {language === 'ar' ? 'الحجم الأقصى: 5 ميجابايت' : language === 'en' ? 'Maximum size: 5MB' : 'Taille maximale: 5MB'}
              </p>
            </>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
            multiple
            onChange={handleInputChange}
          />
        </div>
      </div>

      {/* Modern Document Preview Modal */}
      {selectedDocument && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDocument(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-100 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Gradient */}
            <div className={`relative overflow-hidden bg-gradient-to-r ${getCategoryColor(selectedDocument.category)} p-6`}>
              <div className="absolute inset-0 bg-grid-white/10"></div>
              <div className="absolute -top-10 -right-10 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-xl text-white">
                    {getIcon(selectedDocument.icon)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedDocument.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-white/80 text-sm bg-white/20 px-2 py-0.5 rounded-full">
                        {getCategoryLabel(selectedDocument.category)}
                      </span>
                      {selectedDocument.uploadedAt && (
                        <span className="text-white/60 text-sm flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(selectedDocument.uploadedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="p-2.5 hover:bg-white/20 rounded-xl transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {selectedDocument.type === 'photo' && getSafeImageSrc(selectedDocument.data) ? (
                <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 flex items-center justify-center">
                  <img 
                    src={getSafeImageSrc(selectedDocument.data)!} 
                    alt={selectedDocument.name}
                    className="max-w-full max-h-80 object-contain rounded-lg shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white mb-2">
                    {language === 'ar' 
                      ? 'معاينة المستند غير متوفرة'
                      : language === 'en'
                      ? 'Document preview not available'
                      : 'Aperçu du document non disponible'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === 'ar' 
                      ? 'قم بتنزيل المستند لعرضه'
                      : language === 'en'
                      ? 'Download the document to view it'
                      : 'Téléchargez le document pour le visualiser'}
                  </p>
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => handleDownload(selectedDocument)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-violet-500/30"
                >
                  <Download className="w-5 h-5" />
                  {language === 'ar' ? 'تحميل' : language === 'en' ? 'Download' : 'Télécharger'}
                </button>
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="px-6 py-3.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors"
                >
                  {language === 'ar' ? 'إغلاق' : language === 'en' ? 'Close' : 'Fermer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { Calendar, Clock, FileText, TrendingUp, User, Award, Target, Activity } from "lucide-react"
import { useEffect, useState } from "react"

export default function UserDashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState({
    totalDays: 0,
    pendingLeaves: 0,
    approvedLeaves: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/conges')
      if (response.ok) {
        const data = await response.json()
        const requests = data.requests || []
        setStats({
          totalDays: requests.reduce((sum: number, req: any) => sum + (req.duration || 0), 0),
          pendingLeaves: requests.filter((r: any) => r.status === 'EN_ATTENTE').length,
          approvedLeaves: requests.filter((r: any) => r.status === 'VALIDE').length
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const quickActions = [
    {
      title: "Demande de congé",
      description: "Soumettre une nouvelle demande",
      icon: Calendar,
      href: "/conges",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400"
    },
    {
      title: "Pointage",
      description: "Enregistrer arrivée/départ",
      icon: Clock,
      href: "/pointage",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      title: "Documents",
      description: "Mes documents RH",
      icon: FileText,
      href: "/documents",
      color: "from-teal-500 to-teal-600",
      bgColor: "bg-teal-50 dark:bg-teal-900/20",
      iconColor: "text-teal-600 dark:text-teal-400"
    },
    {
      title: "Mon Profil",
      description: "Informations personnelles",
      icon: User,
      href: "/profile",
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      iconColor: "text-orange-600 dark:text-orange-400"
    }
  ]

  const statCards = [
    {
      title: "Congés approuvés",
      value: stats.approvedLeaves,
      icon: Award,
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
      iconBg: "bg-green-500",
      trend: "+12%"
    },
    {
      title: "En attente",
      value: stats.pendingLeaves,
      icon: Clock,
      color: "from-amber-500 to-orange-600",
      bgColor: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20",
      iconBg: "bg-amber-500",
      trend: "En cours"
    },
    {
      title: "Total jours",
      value: stats.totalDays,
      icon: Target,
      color: "from-purple-500 to-violet-600",
      bgColor: "bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20",
      iconBg: "bg-purple-500",
      trend: "Cette année"
    },
    {
      title: "Performance",
      value: "98%",
      icon: Activity,
      color: "from-cyan-500 to-blue-600",
      bgColor: "bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20",
      iconBg: "bg-cyan-500",
      trend: "+5%"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 rounded-3xl shadow-2xl mb-8 p-8 md:p-12">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-xl">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Bienvenue, {session?.user?.name || "Employé"}
                </h1>
                <p className="text-purple-100 text-lg">
                  Votre espace personnel de gestion
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className={`${stat.bgColor} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50 hover:scale-105 cursor-pointer`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.iconBg} w-12 h-12 rounded-xl flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {stat.trend}
                </span>
              </div>
              <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                {stat.title}
              </h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-purple-600" />
              Actions rapides
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                
                <div className="p-6">
                  <div className={`${action.bgColor} w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                    <action.icon className={`w-7 h-7 ${action.iconColor}`} />
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {action.title}
                  </h3>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {action.description}
                  </p>
                </div>

                <div className={`h-1 bg-gradient-to-r ${action.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></div>
              </Link>
            ))}
          </div>
        </div>

        {/* Profile Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Informations personnelles
            </h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nom complet</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{session?.user?.name || "Non défini"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{session?.user?.email || "Non défini"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rôle</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{session?.user?.role || "Employé"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Statut</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">Actif</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

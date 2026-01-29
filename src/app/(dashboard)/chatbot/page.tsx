"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Send, Cpu, User, Loader, MessageSquare } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export default function ChatbotPage() {
  const { data: session } = useSession()
  const { t, language } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `${t("welcome")} ${session?.user?.name || ""}\n\n${t("chatbot_welcome")}`,
          timestamp: new Date(),
        },
      ])
    }
  }, [session?.user?.name, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Simulate AI response (replace with actual API call when ready)
    setTimeout(() => {
      const responses = [
        "Je comprends votre question. Laissez-moi vérifier les informations pour vous.",
        "Voici ce que je peux vous dire à ce sujet...",
        "C'est une excellente question! Voici les informations que j'ai trouvées.",
        "Je suis là pour vous aider. Voici ma réponse.",
      ]
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: `${responses[Math.floor(Math.random() * responses.length)]}\n\nCette fonctionnalité est en cours de développement. Bientôt, je pourrai répondre à vos questions RH de manière plus détaillée!`,
        timestamp: new Date(),
      }
      
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  return (
    <div className={`max-w-4xl mx-auto h-[calc(100vh-8rem)] ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-gray-900 dark:text-white">{t("chatbot_title")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("chatbot_subtitle")}</p>
        </div>
        <div className={`${language === 'ar' ? 'mr-auto' : 'ml-auto'} flex items-center gap-2`}>
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-500 dark:text-gray-400">{t("chatbot_online")}</span>
        </div>
      </div>

      {/* Messages Container */}
      <div className="bg-gray-50 dark:bg-gray-900 border-x border-gray-200 dark:border-gray-700 h-[calc(100%-8rem)] overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === "user"
                  ? "bg-violet-100 dark:bg-violet-900/30"
                  : "bg-gradient-to-br from-violet-500 to-purple-600"
              }`}
            >
              {message.role === "user" ? (
                <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              ) : (
                <Cpu className="w-4 h-4 text-white" />
              )}
            </div>
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-violet-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              <p
                className={`text-xs mt-2 ${
                  message.role === "user" ? "text-violet-200" : "text-gray-400"
                }`}
              >
                {message.timestamp.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Loader className="w-4 h-4 animate-spin" />
                <span className="text-sm">{t("chatbot_typing")}</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-b-2xl border border-t-0 border-gray-200 dark:border-gray-700 p-4"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chatbot_placeholder")}
            className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl px-6 py-3 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            <span className="hidden sm:inline">{t("chatbot_send")}</span>
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
          <MessageSquare className="inline w-3 h-3 mr-1" />
          {t("chatbot_beta")}
        </p>
      </form>
    </div>
  )
}

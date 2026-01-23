"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Checkbox } from "@/components/ui/Checkbox"
import { GoogleButton } from "./GoogleButton"
import Link from "next/link"

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })

  const handleSubmit = async (e: React. FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email: formData. email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError("Email ou mot de passe incorrect")
      } else {
        router. push("/")
        router.refresh()
      }
    } catch (error) {
      setError("Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Sign in
        </h1>
        <p className="mt-2 text-gray-600">
          Connectez-vous à votre compte
        </p>
      </div>

      {/* Google Button */}
      <GoogleButton />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">
            ou continuer avec email
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Input
          label="Email"
          type="email"
          placeholder="votre@email.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e. target.value })}
          required
        />

        <Input
          label="Mot de passe"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e. target.value })}
          required
        />

        <div className="flex items-center justify-between">
          <Checkbox
            label="Rester connecté"
            checked={formData.rememberMe}
            onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
          />
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-violet-600 hover:text-violet-500"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <Button type="submit" isLoading={isLoading}>
          Se connecter
        </Button>
      </form>

    </div>
  )
}
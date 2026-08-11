import React, { useState } from "react"
import { useNavigate, useLocation } from "react-router"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { UserRole } from "@/types/auth"
import {
  Activity,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Stethoscope,
  Building2,
  Building,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sun,
  Moon,
} from "lucide-react"

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState<string>("doctor@cityhospital.com")
  const [password, setPassword] = useState<string>("Password123!")
  const [role, setRole] = useState<UserRole>("DOCTOR")
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState<boolean>(false)

  const from = location.state?.from?.pathname || "/"

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
      return next
    })
  }

  const rolePresets: { role: UserRole; title: string; email: string; icon: any }[] = [
    { role: "DOCTOR", title: "OPD Doctor", email: "doctor@cityhospital.com", icon: Stethoscope },
    { role: "RECEPTIONIST", title: "Receptionist", email: "reception@cityhospital.com", icon: UserCheck },
    { role: "HOSPITAL_ADMIN", title: "Hospital Admin", email: "admin@cityhospital.com", icon: Building2 },
    { role: "SUPER_ADMIN", title: "Super Admin", email: "admin@hmsabdm.gov.in", icon: Building },
  ]

  const handleSelectRolePreset = (presetRole: UserRole, presetEmail: string) => {
    setRole(presetRole)
    setEmail(presetEmail)
    setPassword("Password123!")
    setErrorMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email || !password) {
      setErrorMessage("Please enter both email address and password.")
      return
    }

    try {
      await login({
        email,
        password,
        role,
      })
      navigate(from, { replace: true })
    } catch (err: any) {
      setErrorMessage(err?.message || "Invalid credentials or unauthorized login attempt.")
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative overflow-hidden">
      {/* Dynamic Background Glow Details */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none translate-y-1/2" />

      {/* Top Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-foreground">HMS ABDM</span>
              <Badge variant="success" className="text-[10px] px-2 py-0.5">
                V1.0 Live
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">National Health Authority Integration Portal</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? (
            <Sun className="h-5 w-5 text-amber-400" />
          ) : (
            <Moon className="h-5 w-5 text-slate-700 dark:text-slate-200" />
          )}
        </Button>
      </header>

      {/* Main Login Card Section */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-md space-y-6">
          <Card className="shadow-xl border-border bg-card/95 backdrop-blur-sm">
            <CardHeader className="space-y-2 text-center pb-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-1">
                <Lock className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">Staff Sign In</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Access your hospital dashboard, OPD desk, ABHA register & patient records.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Quick Role Selection Presets */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Select Login Role</Label>
                <div className="grid grid-cols-2 gap-2">
                  {rolePresets.map((preset) => {
                    const Icon = preset.icon
                    const isSelected = role === preset.role
                    return (
                      <button
                        key={preset.role}
                        type="button"
                        onClick={() => handleSelectRolePreset(preset.role, preset.email)}
                        className={`
                          flex items-center gap-2 p-2.5 rounded-lg border text-xs text-left transition-all
                          ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                              : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                          }
                        `}
                      >
                        <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="truncate">{preset.title}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Work Email / User ID</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@hospital.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <a
                      href="#forgot"
                      onClick={(e) => {
                        e.preventDefault()
                        alert("Contact your Hospital Admin to reset your credentials.")
                      }}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      title={showPassword ? "Hide Password" : "Show Password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full font-semibold shadow-md" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>Sign In to ABDM Portal</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2 text-center border-t border-border/50">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Encrypted ABDM Gateway Channel (M1 & M2)</span>
              </div>
            </CardFooter>
          </Card>

          {/* ABDM Milestone Information Badge */}
          <div className="rounded-xl border bg-card/60 p-4 backdrop-blur-xs flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-foreground">ABDM Milestone 1 & 2 Verification Ready</p>
              <p className="text-muted-foreground leading-relaxed">
                Includes Aadhaar OTP enrollment, ABHA address assignment, Scan & Share queue management, and OPD consultation workflows.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full px-6 py-4 text-center text-xs text-muted-foreground z-10 border-t border-border/40 bg-card/40">
        <p>© 2026 HMS ABDM Healthcare Management System. Compliant with NHA ABDM Specifications.</p>
      </footer>
    </div>
  )
}

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
  QrCode,
  Sparkles,
  HeartPulse,
  FileSpreadsheet,
  Check,
} from "lucide-react"

interface RolePreset {
  role: UserRole
  title: string
  subtitle: string
  email: string
  icon: React.ElementType
  color: string
  badgeText: string
}

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState<string>("doctor@cityhospital.com")
  const [password, setPassword] = useState<string>("Password123!")
  const [role, setRole] = useState<UserRole>("DOCTOR")
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [rememberMe, setRememberMe] = useState<boolean>(true)
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

  const rolePresets: RolePreset[] = [
    {
      role: "DOCTOR",
      title: "OPD Doctor",
      subtitle: "Consultation, e-Prescriptions & Care Contexts",
      email: "doctor@cityhospital.com",
      icon: Stethoscope,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
      badgeText: "Clinical OPD",
    },
    {
      role: "RECEPTIONIST",
      title: "Reception Desk",
      subtitle: "Token Search, ABHA Creation & Queue",
      email: "reception@cityhospital.com",
      icon: UserCheck,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
      badgeText: "Front Desk",
    },
    {
      role: "HOSPITAL_ADMIN",
      title: "Hospital Admin",
      subtitle: "Facility M1/M2/M3 Services & Staff Controls",
      email: "admin@cityhospital.com",
      icon: Building2,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/30",
      badgeText: "Facility Admin",
    },
    {
      role: "SUPER_ADMIN",
      title: "Super Admin",
      subtitle: "NHA Gateway Integration & Portal Governance",
      email: "admin@hmsabdm.gov.in",
      icon: Building,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
      badgeText: "NHA System",
    },
  ]

  const selectedPreset = rolePresets.find((p) => p.role === role) || rolePresets[0]

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
        rememberMe,
      })
      navigate(from, { replace: true })
    } catch (err: any) {
      setErrorMessage(err?.message || "Invalid credentials or unauthorized login attempt.")
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Background Mesh Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Sticky Navigation Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between z-20 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-foreground">HMS ABDM</span>
              <Badge variant="success" className="text-[10px] px-2 py-0.5 font-semibold">
                NHA Live
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              National Health Authority ABDM Ecosystem Suite
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>M1, M2 & M3 ABDM Certified</span>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleDarkMode}
            className="rounded-full h-9 w-9 transition-all hover:bg-accent"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Split Grid Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 gap-8 items-center z-10">
        {/* Left Side: Enterprise ABDM Feature Showcase */}
        <div className="lg:col-span-6 space-y-6 hidden lg:flex flex-col justify-center pr-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold w-fit">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Digital Health Mission 2.0 Integration</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              Unified Healthcare Management & ABDM Gateway
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              Seamlessly connect OPD Reception, Doctor Desk, Patient Records, and Care Context Services with NHA Health Facility Registry (HFR) and Health Professional Registry (HPR).
            </p>
          </div>

          {/* Key Feature Cards Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur-xs space-y-2 hover:border-primary/40 transition-all hover:shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <QrCode className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground">Scan & Share Token</h3>
              </div>
              <p className="text-[11px] text-muted-foreground">Instant OPD queue token creation via patient ABHA QR scan.</p>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur-xs space-y-2 hover:border-primary/40 transition-all hover:shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <HeartPulse className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground">OPD Consultations</h3>
              </div>
              <p className="text-[11px] text-muted-foreground">Digital e-Prescriptions, ICD-10 diagnoses & vitals recording.</p>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur-xs space-y-2 hover:border-primary/40 transition-all hover:shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground">Care Context Sync</h3>
              </div>
              <p className="text-[11px] text-muted-foreground">Automated ABDM M2 health document linkage & HIP consent.</p>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur-xs space-y-2 hover:border-primary/40 transition-all hover:shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground">NHA Compliance</h3>
              </div>
              <p className="text-[11px] text-muted-foreground">Aadhaar eKYC, M1, M2 & M3 Sandbox production ready.</p>
            </div>
          </div>

          {/* Testimonial / Compliance Footer Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-card to-emerald-500/10 border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-semibold text-foreground">Active ABDM Gateway Status: All Nodes Operational</span>
            </div>
            <span className="text-[11px] font-mono font-medium text-muted-foreground">99.98% Uptime</span>
          </div>
        </div>

        {/* Right Side: High-End Sign-In Card */}
        <div className="lg:col-span-6 flex items-center justify-center w-full">
          <div className="w-full max-w-md space-y-5">
            <Card className="shadow-2xl border-border bg-card/95 backdrop-blur-md rounded-2xl overflow-hidden transition-all">
              <CardHeader className="space-y-2 pb-4 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold tracking-tight">Staff Sign In</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Select role & enter your work credentials
                      </CardDescription>
                    </div>
                  </div>

                  <Badge variant="outline" className="text-[11px] border-primary/30 text-primary bg-primary/5">
                    {selectedPreset.badgeText}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 pt-5">
                {/* Interactive Role Selector Chips */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">Select Login Preset Role</Label>
                    <span className="text-[10px] text-muted-foreground">Click chip to auto-fill</span>
                  </div>

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
                            group flex items-center gap-2.5 p-3 rounded-xl border text-xs text-left transition-all duration-200 active:scale-[0.98]
                            ${
                              isSelected
                                ? `${preset.color} font-semibold ring-2 ring-primary/40 shadow-xs`
                                : "border-border/80 bg-muted/30 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                            }
                          `}
                        >
                          <div
                            className={`p-1.5 rounded-lg transition-colors ${
                              isSelected ? "bg-background shadow-xs" : "bg-muted group-hover:bg-background"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                          </div>
                          <div className="truncate min-w-0">
                            <p className="truncate font-medium text-xs">{preset.title}</p>
                            <p className="text-[10px] text-muted-foreground/80 truncate">{preset.badgeText}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Selected Role Subtitle Banner */}
                <div className="p-3 rounded-xl bg-muted/50 border border-border/60 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground truncate">{selectedPreset.subtitle}</span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs animate-in fade-in-50">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Form Inputs */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold">
                      Work Email / User ID
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@hospital.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 h-10 border-border focus-visible:ring-primary"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-semibold">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => alert("Contact Hospital IT Admin to reset password credentials.")}
                        className="text-[11px] font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 pr-9 h-10 border-border focus-visible:ring-primary"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4 accent-primary"
                      />
                      <span>Keep me logged in on this terminal</span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full font-semibold shadow-md h-11 text-sm transition-all duration-200 active:scale-[0.99]"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        <span>Authenticating Credentials...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span>Sign In to {selectedPreset.title}</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>

              <CardFooter className="flex flex-col gap-2 pt-3 pb-4 text-center border-t border-border/40 bg-muted/20">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Encrypted NHA ABDM M1, M2 & M3 Channel</span>
                </div>
              </CardFooter>
            </Card>

            {/* Quick Mobile ABDM Feature Badge */}
            <div className="lg:hidden rounded-xl border bg-card/60 p-4 backdrop-blur-xs flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-foreground">NHA ABDM Sandbox Verified</p>
                <p className="text-muted-foreground leading-relaxed">
                  Includes Aadhaar OTP enrollment, ABHA address assignment, Scan & Share queue management, and OPD consultation workflows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-4 text-center text-xs text-muted-foreground z-10 border-t border-border/40 bg-card/40 backdrop-blur-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto gap-2">
          <p>© 2026 HMS ABDM Healthcare Management System. Compliant with NHA ABDM Specifications.</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="hover:underline cursor-pointer">Security Policy</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">NHA HFR / HPR Guidelines</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Helpdesk</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

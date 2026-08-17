import React, { useState } from "react"
import { useNavigate, useLocation } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { FormInput } from "@/components/common/FormInput"
import { brandName } from "@/constants/appConstants"
import {
  User as UserIcon,
  Lock,
  ArrowRight,
  AlertCircle,
  Stethoscope,
  Building2,
  Users,
  ShieldCheck,
  TrendingUp,
} from "lucide-react"

// Zod Form Validation Schema
const loginSchema = z.object({
  login_id: z.string().min(1, "Please enter your User ID or Email"),
  password: z.string().min(1, "Please enter your password"),
  rememberMe: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const from = location.state?.from?.pathname || "/"

  // react-hook-form integration
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login_id: "superadmin@hms.com",
      password: "password",
      // rememberMe: true,
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null)

    try {
      await login({
        login_id: data.login_id,
        email: data.login_id,
        username: data.login_id,
        password: data.password,
        rememberMe: data.rememberMe,
      })
      navigate(from, { replace: true })
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Invalid User ID/Email or password. Please try again."
      )
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between overflow-x-hidden bg-[#F4F7FB] font-sans selection:bg-[#0D9488] selection:text-white dark:bg-slate-950">
      {/* Complete Full Screen Background Hospital Image */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="/login_bg.png"
          alt={`${brandName} Hospital Background`}
          className="h-full w-full object-cover object-center opacity-90 dark:opacity-20"
        />
        {/* Soft Feathered White-to-Light-Blue Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/75 via-sky-50/65 to-transparent dark:from-slate-950/90 dark:via-slate-950/70 dark:to-transparent" />
      </div>

      {/* Top Header Navigation Bar */}
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-10 sm:py-6">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0D9488] text-white shadow-md shadow-teal-600/20 sm:h-10 sm:w-10">
            <div className="relative flex h-4 w-4 items-center justify-center sm:h-5 sm:w-5">
              <div className="absolute h-4 w-1.5 rounded-sm bg-white sm:h-5 sm:w-2" />
              <div className="absolute h-1.5 w-4 rounded-sm bg-white sm:h-2 sm:w-5" />
            </div>
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 uppercase sm:text-xl dark:text-white">
              {brandName}
            </span>
            <p className="text-[10px] font-medium text-slate-500 sm:text-[11px] dark:text-slate-400">
              Hospital Management System
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="relative z-10 mx-auto my-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-6 sm:px-10">
        <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* LEFT COLUMN: Welcome Showcase & Feature Cards (Desktop view; hidden on mobile) */}
          <div className="hidden space-y-8 pr-6 lg:col-span-6 lg:block">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <span>Welcome Back!</span>
                <span className="text-base">👋</span>
              </div>

              <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-[#0F172A] sm:text-4xl lg:text-[42px] dark:text-white">
                Sign in to your account
              </h1>

              <p className="max-w-md text-sm leading-relaxed font-normal text-slate-600 sm:text-base dark:text-slate-400">
                Manage your hospital operations with speed and precision.
              </p>
            </div>

            {/* 3 Soft Glassmorphism Feature Cards */}
            <div className="max-w-md space-y-3">
              <div className="p- flex items-center gap-4 rounded-2xl border-white/80 bg-white/80 p-3.5 shadow-xs backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/75">
                <div className="shrink-0 rounded-xl bg-teal-50 p-2.5 text-[#0D9488] dark:bg-teal-950/50">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Smart Dashboard
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Real-time insights & analytics
                  </p>
                </div>
              </div>

              <div className="p- flex items-center gap-4 rounded-2xl border border-white/80 bg-white/80 p-3.5 shadow-xs backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/75">
                <div className="shrink-0 rounded-xl bg-teal-50 p-2.5 text-[#0D9488] dark:bg-teal-950/50">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Secure & Reliable
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Your data is always protected
                  </p>
                </div>
              </div>

              <div className="p- flex items-center gap-4 rounded-2xl border-white/80 bg-white/80 p-3.5 shadow-xs backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/75">
                <div className="shrink-0 rounded-xl bg-teal-50 p-2.5 text-[#0D9488] dark:bg-teal-950/50">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Better Management
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Streamline hospital operations
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Floating Stats Card */}
            <div className="max-w-md rounded-2xl border border-white/80 bg-white/80 p-4 shadow-md backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/85">
              <div className="grid grid-cols-3 gap-2 divide-x divide-slate-200 text-center dark:divide-slate-800">
                <div className="flex items-center justify-center gap-2 px-1">
                  <div className="shrink-0 rounded-xl bg-teal-50 p-2 text-[#0D9488] dark:bg-teal-950/50">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                      250+
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Doctors
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 px-1">
                  <div className="shrink-0 rounded-xl bg-teal-50 p-2 text-[#0D9488] dark:bg-teal-950/50">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                      12K+
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Patients
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 px-1">
                  <div className="shrink-0 rounded-xl bg-teal-50 p-2 text-[#0D9488] dark:bg-teal-950/50">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                      50+
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Departments
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Clean Centered Login Card */}
          <div className="flex w-full items-center justify-center lg:col-span-6">
            <div className="w-full max-w-md rounded-2xl border border-white/90 bg-white/95 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-sm sm:rounded-3xl sm:p-10 dark:border-slate-800 dark:bg-slate-900">
              {/* Header */}
              <div className="space-y-1 text-center">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
                  Welcome Back!
                </h2>
                <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                  Please sign in to continue
                </p>
              </div>

              {/* Server Error Feedback */}
              {errorMessage && (
                <div className="mt-4 flex animate-in items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 fade-in-50 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Login Form using react-hook-form & FormInput */}
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-6 space-y-4"
              >
                {/* User ID or Email */}
                <FormInput
                  id="login_id"
                  label="User ID or Email"
                  type="text"
                  placeholder="Enter User ID or Email (e.g. superadmin or admin@demo.com)"
                  startIcon={<UserIcon className="h-4 w-4 text-slate-400" />}
                  required
                  error={errors.login_id?.message}
                  inputClassName="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-sm focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                  {...register("login_id")}
                />

                {/* Password */}
                <div className="space-y-1">
                  <FormInput
                    id="password"
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    startIcon={<Lock className="h-4 w-4 text-slate-400" />}
                    required
                    error={errors.password?.message}
                    inputClassName="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-sm focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                    {...register("password")}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="mt-5 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0D9488] py-3.5 text-sm font-semibold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-[#0F766E] active:scale-[0.99]"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Signing In...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      <span>Sign In</span>
                    </div>
                  )}
                </Button>

                {/* Demo Quick Logins */}
                {/* <div className="pt-2">
                  <p className="mb-2 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    Quick Fill Demo Accounts:
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setValue("login_id", "superadmin", {
                          shouldValidate: true,
                        })
                        setValue("password", "password", {
                          shouldValidate: true,
                        })
                      }}
                      className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-center text-[11px] font-medium text-slate-700 transition hover:border-[#0D9488] hover:bg-teal-50/50 hover:text-[#0D9488] dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
                    >
                      Super Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setValue("login_id", "admin", { shouldValidate: true })
                        setValue("password", "password", {
                          shouldValidate: true,
                        })
                      }}
                      className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-center text-[11px] font-medium text-slate-700 transition hover:border-[#0D9488] hover:bg-teal-50/50 hover:text-[#0D9488] dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
                    >
                      Hospital Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setValue("login_id", "reception", {
                          shouldValidate: true,
                        })
                        setValue("password", "password", {
                          shouldValidate: true,
                        })
                      }}
                      className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-center text-[11px] font-medium text-slate-700 transition hover:border-[#0D9488] hover:bg-teal-50/50 hover:text-[#0D9488] dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
                    >
                      Receptionist
                    </button>
                  </div>
                </div> */}

                {/* Data Security Footer Badge */}
                <div className="flex items-center justify-center gap-1.5 pt-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Your data is secure</span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs font-normal text-slate-400 uppercase dark:text-slate-500">
        © 2025 {brandName}. All rights reserved.
      </footer>
    </div>
  )
}

import React, { createContext, useContext, useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { settingsService } from "@/services/settingsService"
import { useAuth } from "./AuthContext"
import { toast } from "sonner"

export interface BrandingData {
  brandName: string
  brandTagline: string
  brandLogo: string
  brandFavicon: string
}

interface BrandingContextType extends BrandingData {
  updateBranding: (data: Partial<BrandingData>) => Promise<void>
  isUpdating: boolean
}

const STORAGE_KEY = "hms_hospital_branding"

const defaultBranding: BrandingData = {
  brandName: "",
  brandTagline: "",
  brandLogo: "",
  brandFavicon: "",
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined)

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Local storage cache for instant offline / page refresh load
  const [cached, setCached] = useState<BrandingData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return defaultBranding
  })

  // Fetch from backend settings API
  const { data: serverSettings } = useQuery({
    queryKey: ["hospital", "settings", "branding"],
    queryFn: () => settingsService.getSettings("branding"),
    staleTime: 5 * 60 * 1000,
  })

  const effectiveBrandName =
    serverSettings?.brand_name ||
    cached.brandName ||
    user?.hospital?.name ||
    user?.hospital_name ||
    user?.hospitalName ||
    "Demo Care Hospital"

  const effectiveBrandTagline =
    serverSettings?.brand_tagline ??
    cached.brandTagline ??
    "Multi-Speciality Healthcare"

  const effectiveBrandLogo = serverSettings?.brand_logo || cached.brandLogo || ""
  const effectiveBrandFavicon = serverSettings?.brand_favicon || cached.brandFavicon || ""

  // Update Document title & favicon dynamically
  useEffect(() => {
    if (effectiveBrandName) {
      document.title = `${effectiveBrandName} | HMS Portal`
    }
    if (effectiveBrandFavicon) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']")
      if (!link) {
        link = document.createElement("link")
        link.rel = "icon"
        document.getElementsByTagName("head")[0].appendChild(link)
      }
      link.href = effectiveBrandFavicon
    }
  }, [effectiveBrandName, effectiveBrandFavicon])

  const saveMutation = useMutation({
    mutationFn: async (newData: Partial<BrandingData>) => {
      const updated: BrandingData = {
        brandName: newData.brandName !== undefined ? newData.brandName : effectiveBrandName,
        brandTagline: newData.brandTagline !== undefined ? newData.brandTagline : effectiveBrandTagline,
        brandLogo: newData.brandLogo !== undefined ? newData.brandLogo : effectiveBrandLogo,
        brandFavicon: newData.brandFavicon !== undefined ? newData.brandFavicon : effectiveBrandFavicon,
      }

      // Save to backend settings
      await settingsService.saveSettings("branding", {
        brand_name: updated.brandName,
        brand_tagline: updated.brandTagline,
        brand_logo: updated.brandLogo,
        brand_favicon: updated.brandFavicon,
      })

      // Cache locally
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      setCached(updated)
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospital", "settings", "branding"] })
      toast.success("Hospital branding & logo updated successfully!")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save hospital branding")
    },
  })

  const updateBranding = async (data: Partial<BrandingData>) => {
    await saveMutation.mutateAsync(data)
  }

  return (
    <BrandingContext.Provider
      value={{
        brandName: effectiveBrandName,
        brandTagline: effectiveBrandTagline,
        brandLogo: effectiveBrandLogo,
        brandFavicon: effectiveBrandFavicon,
        updateBranding,
        isUpdating: saveMutation.isPending,
      }}
    >
      {children}
    </BrandingContext.Provider>
  )
}

export const useBranding = () => {
  const context = useContext(BrandingContext)
  if (!context) {
    throw new Error("useBranding must be used within a BrandingProvider")
  }
  return context
}

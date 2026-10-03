import { apiClient } from "./apiClient"
import type {
  AbhaOtpResponse,
  AbhaVerifyResponse,
  AbhaProfile,
  AbhaSuggestedAddressResponse,
  AbhaCreateAddressResponse,
  AbhaSearchResponse,
  AbhaCardResponse,
  AbhaQrResponse,
  CreateAbhaAddressDto,
} from "@/types/abha"

export const abhaService = {
  /**
   * Flow A1: Request Mobile OTP for existing ABHA login
   */
  generateOtp: async (mobile: string): Promise<AbhaOtpResponse> => {
    return apiClient<AbhaOtpResponse>("/abha/generate-otp", {
      method: "POST",
      body: JSON.stringify({ mobile }),
    })
  },

  /**
   * Flow A2: Verify Mobile OTP
   */
  verifyOtp: async (txnId: string, otp: string): Promise<AbhaVerifyResponse> => {
    return apiClient<AbhaVerifyResponse>("/abha/verify-otp", {
      method: "POST",
      body: JSON.stringify({ txnId, otp }),
    })
  },

  /**
   * Flow B1: Request Aadhaar OTP for ABHA enrolment
   */
  generateAadhaarOtp: async (aadhaar: string): Promise<AbhaOtpResponse> => {
    return apiClient<AbhaOtpResponse>("/abha/enrol/aadhaar-otp", {
      method: "POST",
      body: JSON.stringify({ aadhaar }),
    })
  },

  /**
   * Flow B2: Verify Aadhaar OTP and provide mobile for linking
   */
  verifyAadhaarOtp: async (
    txnId: string,
    otp: string,
    mobile: string
  ): Promise<AbhaVerifyResponse> => {
    return apiClient<AbhaVerifyResponse>("/abha/enrol/verify-aadhaar", {
      method: "POST",
      body: JSON.stringify({ txnId, otp, mobile }),
    })
  },

  /**
   * Flow B3: Send OTP to mobile for linking (secondary verification)
   */
  generateMobileOtpForLinking: async (
    txnId: string,
    mobile: string
  ): Promise<AbhaOtpResponse> => {
    return apiClient<AbhaOtpResponse>("/abha/enrol/mobile-otp", {
      method: "POST",
      body: JSON.stringify({ txnId, mobile }),
    })
  },

  /**
   * Flow B4: Verify mobile OTP for linking
   */
  verifyMobileOtpForLinking: async (
    txnId: string,
    otp: string
  ): Promise<{ authCode: string; message?: string }> => {
    return apiClient<{ authCode: string; message?: string }>("/abha/enrol/verify-mobile", {
      method: "POST",
      body: JSON.stringify({ txnId, otp }),
    })
  },

  /**
   * Flow B5: Suggest available ABHA addresses
   */
  suggestAbhaAddress: async (
    txnId: string,
    token: string
  ): Promise<AbhaSuggestedAddressResponse> => {
    const params = new URLSearchParams({ txnId, token })
    return apiClient<AbhaSuggestedAddressResponse>(`/abha/enrol/suggest-address?${params.toString()}`)
  },

  /**
   * Flow B6: Select or create ABHA address
   */
  createAbhaAddress: async (payload: CreateAbhaAddressDto): Promise<AbhaCreateAddressResponse> => {
    return apiClient<AbhaCreateAddressResponse>("/abha/enrol/create-address", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Flow Profile: Fetch patient's ABDM profile using token
   */
  getProfile: async (token: string): Promise<AbhaProfile> => {
    const params = new URLSearchParams({ token })
    return apiClient<AbhaProfile>(`/abha/profile?${params.toString()}`)
  },

  /**
   * Flow Search: Search ABHA accounts by mobile number
   */
  searchAbha: async (mobile: string): Promise<AbhaSearchResponse> => {
    return apiClient<AbhaSearchResponse>("/abha/search", {
      method: "POST",
      body: JSON.stringify({ mobile }),
    })
  },

  /**
   * Flow Card: Download ABHA Card (base64)
   */
  downloadCard: async (token: string): Promise<AbhaCardResponse> => {
    const params = new URLSearchParams({ token })
    return apiClient<AbhaCardResponse>(`/abha/card?${params.toString()}`)
  },

  /**
   * Flow QR: Download ABHA QR Code (base64)
   */
  downloadQrCode: async (token: string): Promise<AbhaQrResponse> => {
    const params = new URLSearchParams({ token })
    return apiClient<AbhaQrResponse>(`/abha/qr-code?${params.toString()}`)
  },
}

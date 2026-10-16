export interface AbhaOtpResponse {
  txnId: string
  message?: string
}

export interface AbhaVerifyResponse {
  token: string
  isNew?: boolean
  abhaAddress?: string
  abhaNumber?: string
  authCode?: string
  message?: string
}

export interface AbhaProfile {
  abhaNumber: string
  abhaAddress: string
  name: string
  gender?: string
  yearOfBirth?: string | number
  dayOfBirth?: string | number
  monthOfBirth?: string | number
  dob?: string
  mobile?: string
  address?: string
  district?: string
  state?: string
  pincode?: string
  photo?: string
}

export interface AbhaSuggestedAddressResponse {
  abhaAddresses: string[]
}

export interface AbhaCreateAddressResponse {
  message?: string
  abhaAddress: string
}

export interface AbhaAccountItem {
  abhaNumber: string
  name: string
  status: string
  abhaAddress?: string
}

export interface AbhaSearchResponse {
  accounts: AbhaAccountItem[]
}

export interface AbhaCardResponse {
  data: string
}

export interface AbhaQrResponse {
  data: string
}

// Request DTOs
export interface GenerateMobileOtpDto {
  mobile: string
}

export interface VerifyMobileOtpDto {
  txnId: string
  otp: string
}

export interface GenerateAadhaarOtpDto {
  aadhaar: string
}

export interface VerifyAadhaarOtpDto {
  txnId: string
  otp: string
  mobile: string
}

export interface GenerateMobileOtpForLinkingDto {
  txnId: string
  mobile: string
}

export interface VerifyMobileOtpForLinkingDto {
  txnId: string
  otp: string
}

export interface CreateAbhaAddressDto {
  txnId: string
  token: string
  abhaAddress: string
}

export interface SearchAbhaDto {
  mobile: string
}

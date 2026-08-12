const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1"

export class ApiError extends Error {
  status: number
  data?: any

  constructor(message: string, status: number, data?: any) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("hms_auth_token")

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let errorData: any = null
    try {
      errorData = await response.json()
    } catch {
      errorData = null
    }

    let message = errorData?.message || errorData?.error
    if (errorData?.errors && typeof errorData.errors === "object") {
      const firstKey = Object.keys(errorData.errors)[0]
      if (firstKey && Array.isArray(errorData.errors[firstKey]) && errorData.errors[firstKey][0]) {
        message = errorData.errors[firstKey][0]
      }
    }
    if (!message) {
      message = `HTTP error ${response.status}`
    }

    throw new ApiError(message, response.status, errorData)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  const json = await response.json()
  if (json && typeof json === "object" && "data" in json && json.success === true) {
    return json.data as T
  }

  return json as T
}

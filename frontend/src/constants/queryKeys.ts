export const queryKeys = {
  hospitals: {
    all: ["hospitals"] as const,
    list: (filter?: Record<string, any>) => ["hospitals", "list", filter || {}] as const,
    detail: (id: string | number) => ["hospitals", "detail", id] as const,
  },
  departments: {
    all: ["departments"] as const,
    list: (filter?: Record<string, any>) => ["departments", "list", filter || {}] as const,
  },
  doctors: {
    all: ["doctors"] as const,
    list: (filter?: Record<string, any>) => ["doctors", "list", filter || {}] as const,
  },
  patients: {
    all: ["patients"] as const,
    list: (filter?: Record<string, any>) => ["patients", "list", filter || {}] as const,
  },
}

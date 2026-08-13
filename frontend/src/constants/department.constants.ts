export const INITIAL_FILTERS = {
  search: "",
  status: "",
  page: 1,
  limit: 10,
}

export const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
]

export const DEPARTMENT_FORM_INITIAL_DATA = {
  name: "",
  code: "",
  description: "",
  is_active: true,
}

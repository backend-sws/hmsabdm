export const INITIAL_FILTERS = {
  search: "",
  department_id: "",
  is_active: "",
  page: 1,
  limit: 10,
}

export const STATUS_OPTIONS = [
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" },
]

export const DOCTOR_FORM_INITIAL_DATA = {
  name: "",
  username: "",
  password: "",
  email: "",
  phone: "",
  department_id: "",
  specialization: "",
  qualification: "",
  hpr_id: "",
  consultation_time: 15,
  is_active: true,
}

export const DAYS_OF_WEEK = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
]

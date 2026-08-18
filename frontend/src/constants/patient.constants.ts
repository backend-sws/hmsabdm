export const INITIAL_FILTERS = {
  search: "",
  page: 1,
  limit: 10,
}

export const GENDER_OPTIONS = [
  { label: "Male", value: "M" },
  { label: "Female", value: "F" },
  { label: "Other", value: "O" },
]

export const BLOOD_GROUP_OPTIONS = [
  { label: "A+", value: "A+" },
  { label: "A-", value: "A-" },
  { label: "B+", value: "B+" },
  { label: "B-", value: "B-" },
  { label: "O+", value: "O+" },
  { label: "O-", value: "O-" },
  { label: "AB+", value: "AB+" },
  { label: "AB-", value: "AB-" },
]

export const PATIENT_FORM_INITIAL_DATA = {
  name: "",
  mobile: "",
  email: "",
  dob: "",
  gender: "" as "M" | "F" | "O" | "",
  blood_group: "",
  address: "",
  city: "",
  pincode: "",
  abha_number: "",
  abha_address: "",
}

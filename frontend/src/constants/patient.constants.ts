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

export const GUARDIAN_RELATION_OPTIONS = [
  { label: "Father", value: "Father" },
  { label: "Mother", value: "Mother" },
  { label: "Spouse", value: "Spouse" },
  { label: "Brother", value: "Brother" },
  { label: "Sister", value: "Sister" },
  { label: "Guardian", value: "Guardian" },
  { label: "Other", value: "Other" },
]

export const MARITAL_STATUS_OPTIONS = [
  { label: "Single", value: "Single" },
  { label: "Married", value: "Married" },
  { label: "Divorced", value: "Divorced" },
  { label: "Widowed", value: "Widowed" },
  { label: "Other", value: "Other" },
]

export const PATIENT_FORM_INITIAL_DATA = {
  name: "",
  guardian_name: "",
  guardian_relation: "",
  guardian_phone: "",
  mobile: "",
  gender: "" as "M" | "F" | "O" | "",
  dob: "",
  blood_group: "",
  address: "",
  city: "",
  district: "",
  state: "",
  pincode: "",
  marital_status: "",
  occupation: "",
}

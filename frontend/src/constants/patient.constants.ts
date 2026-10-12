export const INITIAL_FILTERS = {
  search: "",
  gender: "",
  abha_status: "",
  page: 1,
  limit: 10,
}

export const ABHA_STATUS_OPTIONS = [
  { label: "ABHA Linked (Digitized)", value: "linked" },
  { label: "Normal Registry (Non-ABHA)", value: "not_linked" },
]

export const GENDER_OPTIONS = [
  { label: "Male", value: "M" },
  { label: "Female", value: "F" },
  { label: "Other", value: "O" },
]

export const ID_PROOF_OPTIONS = [
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "voter_id", label: "Voter ID" },
  { value: "driving_license", label: "Driving License" },
  { value: "passport", label: "Passport" },
  { value: "ration_card", label: "Ration Card" },
  { value: "other", label: "Other Official Govt ID" },
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

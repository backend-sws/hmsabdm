import type { Department } from "./department"

export interface DoctorSchedule {
  id?: number | string
  doctor_id?: number | string
  day_of_week: number // 0 = Sun, 1 = Mon, ..., 6 = Sat
  start_time: string // HH:MM
  end_time: string // HH:MM
  max_patients?: number
  opd_fee?: number | string
  is_active?: boolean
}

export interface Doctor {
  id: number | string
  hospital_id: number | string
  department_id: number | string
  user_id: number | string
  name: string
  specialization?: string
  qualification?: string
  phone?: string
  email?: string
  hpr_id?: string
  consultation_time?: number
  is_active: boolean
  username?: string
  department?: Department
  user?: {
    id: number | string
    name: string
    email?: string
    username: string
  }
  schedules?: DoctorSchedule[]
}

export interface DoctorFilter {
  search?: string
  department_id?: number | string
  is_active?: boolean | string
  all?: boolean | string
  page?: number
  limit?: number
}

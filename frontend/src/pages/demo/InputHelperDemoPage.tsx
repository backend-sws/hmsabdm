import React, { useState } from "react"
import {
  User,
  Mail,
  Lock,
  Phone,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
} from "lucide-react"
import { FormInput } from "@/components/common/FormInput"
import SectionCard from "@/components/SectionCard"
import sectionHeader from "@/components/sectionHeader"
import { Button } from "@/components/ui/button"

export default function InputHelperDemoPage() {
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "Dr. Ananya Sharma",
    email: "ananya.sharma@hospital.com",
    password: "",
    phone: "+91 98765 43210",
    role: "DOCTOR",
    department: "CARDIOLOGY",
    gender: "MALE",
    appointmentDate: "2026-08-15",
    bio: "Consultant Cardiologist with over 10 years of clinical experience in interventional cardiology and cardiac ICU patient care.",
    receiveNotifications: true,
    agreeTerms: true,
    avatar: null as any,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCustomChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-5xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
            <Sparkles className="h-4 w-4" /> Component Library
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Reusable FormInput Helper
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            All-in-one input control supporting text, email, password, select, radio, switch, date, image uploader, tooltips & validations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={showValidationErrors ? "destructive" : "outline"}
            className="gap-2 active:scale-[0.98]"
            onClick={() => setShowValidationErrors((prev) => !prev)}
          >
            <ShieldAlert className="h-4 w-4" />
            {showValidationErrors ? "Clear Error States" : "Simulate Validation Errors"}
          </Button>
        </div>
      </div>

      {/* Interactive Form Showcase */}
      <SectionCard
        title="Interactive Patient Registration Form"
        description="Demonstrating input field variations, tooltips, validation messages, and image uploader."
      >
        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
          {/* Section 1: Basic Information */}
          <div className="rounded-xl border bg-card p-6 shadow-xs space-y-6">
            {sectionHeader("01", "Personal & Contact Information")}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name Input */}
              <FormInput
                name="fullName"
                label="Full Name"
                type="text"
                placeholder="Enter full legal name"
                required
                startIcon={<User className="h-4 w-4" />}
                tooltip="Enter full name as printed on official ID documents (Aadhaar / Passport)"
                value={formData.fullName}
                onChange={handleChange}
                error={showValidationErrors ? "Full name is required and must be at least 3 characters" : undefined}
                success={!showValidationErrors && formData.fullName ? "Valid name" : false}
              />

              {/* Email Address Input */}
              <FormInput
                name="email"
                label="Official Email Address"
                type="email"
                placeholder="doctor@hospital.com"
                required
                startIcon={<Mail className="h-4 w-4" />}
                tooltip="Hospital system login notifications will be sent to this email"
                value={formData.email}
                onChange={handleChange}
                error={showValidationErrors ? "Please enter a valid hospital email address" : undefined}
              />

              {/* Password Field with built-in reveal toggle */}
              <FormInput
                name="password"
                label="Account Password"
                type="password"
                placeholder="••••••••••••"
                required
                startIcon={<Lock className="h-4 w-4" />}
                tooltip="Password must contain at least 8 characters, 1 uppercase, 1 symbol"
                helperText="Must be at least 8 characters long"
                value={formData.password}
                onChange={handleChange}
                error={showValidationErrors ? "Password does not meet complexity requirements" : undefined}
              />

              {/* Phone Number Input */}
              <FormInput
                name="phone"
                label="Mobile Phone Number"
                type="tel"
                placeholder="+91 98765 43210"
                startIcon={<Phone className="h-4 w-4" />}
                tooltip="Emergency alert SMS notifications will be routed here"
                value={formData.phone}
                onChange={handleChange}
                error={showValidationErrors ? "Invalid 10-digit phone number" : undefined}
              />
            </div>
          </div>

          {/* Section 2: Role & Dropdowns */}
          <div className="rounded-xl border bg-card p-6 shadow-xs space-y-6">
            {sectionHeader("02", "Role, Department & Selection Fields")}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Select Dropdown Input */}
              <FormInput
                name="department"
                label="Assigned Clinical Department"
                type="select"
                placeholder="Select hospital department..."
                required
                tooltip="Select primary specialty unit for shift assignments"
                value={formData.department}
                onChange={handleChange}
                options={[
                  { label: "Cardiology Unit", value: "CARDIOLOGY" },
                  { label: "Neurology Department", value: "NEUROLOGY" },
                  { label: "Pediatrics Clinic", value: "PEDIATRICS" },
                  { label: "Orthopedics & Surgery", value: "ORTHOPEDICS" },
                  { label: "Emergency & Trauma", value: "EMERGENCY" },
                ]}
                error={showValidationErrors ? "Department selection is mandatory" : undefined}
              />

              {/* Date Picker Input */}
              <FormInput
                name="appointmentDate"
                label="Joining / Duty Date"
                type="date"
                required
                tooltip="Select official start date for hospital privileges"
                value={formData.appointmentDate}
                onChange={handleChange}
                error={showValidationErrors ? "Valid duty date must be specified" : undefined}
              />
            </div>

            {/* Radio Options Card Input */}
            <FormInput
              name="gender"
              label="Staff Gender / Preferred Title"
              type="radio"
              radioOrientation="horizontal"
              tooltip="Used for staff roster management"
              value={formData.gender}
              onChange={handleChange}
              options={[
                { label: "Male", value: "MALE", description: "Dr. / Mr." },
                { label: "Female", value: "FEMALE", description: "Dr. / Ms. / Mrs." },
                { label: "Other / Prefer Not to Say", value: "OTHER", description: "Mx. / Dr." },
              ]}
              error={showValidationErrors ? "Please select an option" : undefined}
            />
          </div>

          {/* Section 3: Image Upload & Preview */}
          <div className="rounded-xl border bg-card p-6 shadow-xs space-y-6">
            {sectionHeader("03", "Staff Profile Photo & Documents")}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Input Component with Live Preview & Dropzone */}
              <FormInput
                name="avatar"
                label="Profile Avatar Photo"
                type="image"
                required
                tooltip="Upload passport size clear face photo (JPEG/PNG, Max 5MB). Drag & drop supported!"
                helperText="Supports drag-and-drop, live thumbnail preview, zoom view, and remove."
                imageProps={{
                  placeholderText: "Drop photo here or click to browse",
                  maxSizeMB: 5,
                  previewHeight: "h-48",
                  value: formData.avatar,
                  onImageChange: (imgVal) => handleCustomChange("avatar", imgVal?.file || imgVal?.url),
                  onImageRemove: () => handleCustomChange("avatar", null),
                }}
                error={showValidationErrors ? "Profile photo is required for ID badge generation" : undefined}
              />

              {/* Bio Textarea Input */}
              <FormInput
                name="bio"
                label="Doctor Biography & Notes"
                type="textarea"
                rows={5}
                placeholder="Write a brief professional summary..."
                tooltip="Displayed on doctor profile directory for OPD patients"
                helperText="Maximum 500 characters"
                value={formData.bio}
                onChange={handleChange}
                error={showValidationErrors ? "Biography must be between 20 and 500 characters" : undefined}
              />
            </div>
          </div>

          {/* Section 4: Switches & Checkboxes */}
          <div className="rounded-xl border bg-card p-6 shadow-xs space-y-6">
            {sectionHeader("04", "Preferences & Toggles")}

            <div className="space-y-4 max-w-xl">
              {/* Switch Toggle Field */}
              <FormInput
                name="receiveNotifications"
                type="switch"
                label="Enable Real-Time Emergency SMS Alerts"
                helperText="Receive instant notifications for critical patient vitals and ICU calls"
                value={formData.receiveNotifications}
                onChange={(e: any) => handleCustomChange("receiveNotifications", e.target.value)}
              />

              {/* Checkbox Field */}
              <FormInput
                name="agreeTerms"
                type="checkbox"
                label="I confirm all submitted hospital credentials and license documents are accurate"
                helperText="ABDM Compliance & Medical Ethics Code of Practice"
                required
                value={formData.agreeTerms}
                onChange={(e: any) => handleCustomChange("agreeTerms", e.target.checked)}
                error={showValidationErrors ? "You must accept the medical compliance terms" : undefined}
              />
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowValidationErrors(false)
                setFormData({
                  fullName: "",
                  email: "",
                  password: "",
                  phone: "",
                  role: "DOCTOR",
                  department: "",
                  gender: "MALE",
                  appointmentDate: "",
                  bio: "",
                  receiveNotifications: true,
                  agreeTerms: false,
                  avatar: null,
                })
              }}
            >
              Reset Form
            </Button>

            <Button type="submit" className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Save Staff Record
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  )
}

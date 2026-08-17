import { useEffect } from "react"
import { useForm, type SubmitHandler } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-fields"
import { FormContainer } from "@/components/formContainer"
import { sectionHeader } from "@/components/sectionHeader"
import { hospitalService } from "@/services/hospitalService"
import { queryKeys } from "@/constants/queryKeys"
import { HOSPITAL_FORM_INITIAL_DATA } from "@/constants/hospital.constants"
import type { Hospital, CreateHospitalDto } from "@/types/hospital"

interface HospitalEditProps {
  open: boolean
  onClose: (open: boolean) => void
  hospital?: (Hospital & { viewMode?: boolean }) | null
}

export default function HospitalEdit({ open, onClose, hospital }: HospitalEditProps) {
  const isViewMode = !!hospital?.viewMode
  const isEditMode = !!hospital?.id && !hospital?.viewMode
  const hospitalId = hospital?.id

  const { handleSubmit, control, reset } = useForm<CreateHospitalDto>({
    defaultValues: HOSPITAL_FORM_INITIAL_DATA,
    mode: "onChange",
  })

  useEffect(() => {
    if (open) {
      if (isEditMode || isViewMode) {
        reset({
          name: hospital?.name || "",
          code: hospital?.code || "",
          abdm_hip_id: hospital?.abdm_hip_id || "",
          email: hospital?.email || "",
          phone: hospital?.phone || "",
          address: hospital?.address || "",
          city: hospital?.city || "",
          state: hospital?.state || "",
          pincode: hospital?.pincode || "",
        })
      } else {
        reset(HOSPITAL_FORM_INITIAL_DATA)
      }
    }
  }, [open, hospital, reset, isEditMode, isViewMode])

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: CreateHospitalDto) =>
      isEditMode && hospitalId
        ? hospitalService.updateHospital(hospitalId, data)
        : hospitalService.createHospital(data),
    onSuccess: (res: any) => {
      const adminCreds = res?.data?.admin_credentials || res?.admin_credentials
      if (adminCreds && !isEditMode) {
        toast.success(
          `Hospital & Admin created! Email: ${adminCreds.email} | Password: ${adminCreds.password}`,
          { duration: 8000 }
        )
      } else {
        toast.success(
          isEditMode
            ? "Hospital updated successfully"
            : "Hospital registered successfully"
        )
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.hospitals.all })
      reset()
      onClose(false)
    },
    meta: {
      errorTitle: "Failed to save hospital record",
    },
  })

  const onSubmit: SubmitHandler<CreateHospitalDto> = (data) => {
    mutation.mutate(data)
  }

  return (
    <FormContainer
      variant="modal"
      open={open}
      onOpenChange={(isOpen) => onClose(isOpen)}
      title={
        isViewMode
          ? `Facility Details - ${hospital?.name || ""}`
          : isEditMode
            ? "Edit Hospital Facility"
            : "Onboard New Hospital Facility"
      }
      description={
        isViewMode
          ? "Viewing healthcare facility information and ABDM integration parameters."
          : isEditMode
            ? "Update facility profile and contact details."
            : "Register a new healthcare facility in NHA ABDM registry and configure its Admin account."
      }
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onClose(false)}
            disabled={mutation.isPending}
          >
            {isViewMode ? "Close" : "Cancel"}
          </Button>

          {!isViewMode && (
            <Button
              type="submit"
              form="hospital-form"
              disabled={mutation.isPending}
              className="bg-blue-600 font-semibold text-white hover:bg-blue-700"
            >
              {mutation.isPending
                ? "Saving..."
                : isEditMode
                  ? "Save Changes"
                  : "Onboard Hospital"}
            </Button>
          )}
        </div>
      }
    >
      <form
        id="hospital-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
      >
        {/* Section 01 */}
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-2xs sm:p-6">
          {sectionHeader("01", "Facility Identification")}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="name"
              label="FACILITY NAME"
              placeholder="e.g. City Care Super Specialty Hospital"
              required
              readOnly={isViewMode}
              className="sm:col-span-2"
            />

            <FormField
              control={control}
              name="code"
              label="FACILITY CODE"
              placeholder="e.g. CCH-01"
              readOnly={isViewMode}
            />

            <FormField
              control={control}
              name="abdm_hip_id"
              label="ABDM HIP ID (HPR)"
              placeholder="e.g. HIP-1000452"
              readOnly={isViewMode}
            />
          </div>
        </div>

        {/* Section 02 */}
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-2xs sm:p-6">
          {sectionHeader("02", "Contact & Location Details")}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="email"
              label="OFFICIAL EMAIL"
              placeholder="e.g. contact@citycarehospital.com"
              inputType="email"
              readOnly={isViewMode}
            />

            <FormField
              control={control}
              name="phone"
              label="CONTACT PHONE"
              placeholder="e.g. +91 11 2345 6789"
              readOnly={isViewMode}
            />

            <FormField
              control={control}
              name="address"
              label="STREET ADDRESS"
              placeholder="e.g. Plot 45, Knowledge Park III"
              readOnly={isViewMode}
              className="sm:col-span-2"
            />

            <FormField
              control={control}
              name="city"
              label="CITY"
              placeholder="e.g. New Delhi"
              readOnly={isViewMode}
            />

            <FormField
              control={control}
              name="state"
              label="STATE"
              placeholder="e.g. Delhi"
              readOnly={isViewMode}
            />

            <FormField
              control={control}
              name="pincode"
              label="PINCODE"
              placeholder="e.g. 110001"
              readOnly={isViewMode}
              className="sm:col-span-2"
            />
          </div>
        </div>

        {/* Section 03 - Primary Admin Setup (Creation Mode Only) */}
        {!isEditMode && !isViewMode && (
          <div className="space-y-4 rounded-xl border bg-card p-4 shadow-2xs sm:p-6">
            {sectionHeader("03", "Primary Admin Account Setup")}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={control}
                name="admin_name"
                label="ADMIN FULL NAME"
                placeholder="e.g. Dr. Rajesh Sharma (Optional)"
                className="sm:col-span-2"
              />

              <FormField
                control={control}
                name="admin_email"
                label="ADMIN LOGIN EMAIL"
                placeholder="e.g. admin@citycarehospital.com"
                inputType="email"
              />

              <FormField
                control={control}
                name="admin_password"
                label="ADMIN INITIAL PASSWORD"
                placeholder="Auto-generated if left blank"
                inputType="password"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              * If email or password is left empty, the system will automatically assign the hospital email and generate a secure password.
            </p>
          </div>
        )}
      </form>
    </FormContainer>
  )
}

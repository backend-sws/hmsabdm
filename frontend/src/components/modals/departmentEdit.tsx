import { useEffect } from "react"
import { useForm, Controller, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { FormField } from "@/components/ui/form-fields"
import { FormContainer } from "@/components/formContainer"
import { sectionHeader } from "@/components/sectionHeader"
import { departmentService } from "@/services/departmentService"
import { queryKeys } from "@/constants/queryKeys"
import { DEPARTMENT_FORM_INITIAL_DATA } from "@/constants/department.constants"
import { departmentFormSchema, type DepartmentFormValues } from "@/schemas"
import type { Department } from "@/types/department"

interface DepartmentEditProps {
  open: boolean
  onClose: (open: boolean) => void
  department?: (Department & { viewMode?: boolean }) | null
}

export default function DepartmentEdit({ open, onClose, department }: DepartmentEditProps) {
  const isViewMode = !!department?.viewMode
  const isEditMode = !!department?.id && !department?.viewMode
  const departmentId = department?.id

  const { handleSubmit, control, reset } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: DEPARTMENT_FORM_INITIAL_DATA,
    mode: "onChange",
  })

  useEffect(() => {
    if (open) {
      if (isEditMode || isViewMode) {
        reset({
          name: department?.name || "",
          code: department?.code || "",
          description: department?.description || "",
          is_active: department?.is_active ?? true,
        })
      } else {
        reset(DEPARTMENT_FORM_INITIAL_DATA)
      }
    }
  }, [open, department, reset, isEditMode, isViewMode])

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: DepartmentFormValues) =>
      isEditMode && departmentId
        ? departmentService.updateDepartment(departmentId, data)
        : departmentService.createDepartment(data),
    onSuccess: () => {
      toast.success(
        isEditMode
          ? "Department updated successfully"
          : "Department registered successfully"
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.all })
      reset()
      onClose(false)
    },
    meta: {
      errorTitle: "Failed to save department record",
    },
  })

  const onSubmit: SubmitHandler<DepartmentFormValues> = (data) => {
    mutation.mutate(data)
  }

  return (
    <FormContainer
      variant="modal"
      open={open}
      onOpenChange={(isOpen) => onClose(isOpen)}
      title={
        isViewMode
          ? `Department Details - ${department?.name || ""}`
          : isEditMode
            ? "Edit Clinical Department"
            : "Add New Clinical Department"
      }
      description={
        isViewMode
          ? "Viewing clinical department parameters and assigned medical wing info."
          : isEditMode
            ? "Update department details, code identifier, and active status."
            : "Register a new medical department, OPD wing, or clinical specialty unit."
      }
      size="md"
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
              form="department-form"
              disabled={mutation.isPending}
              className="bg-blue-600 font-semibold text-white hover:bg-blue-700"
            >
              {mutation.isPending
                ? "Saving..."
                : isEditMode
                  ? "Save Changes"
                  : "Add Department"}
            </Button>
          )}
        </div>
      }
    >
      <form
        id="department-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
      >
        {/* Section 01 */}
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-2xs sm:p-6">
          {sectionHeader("01", "Department Identification")}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="name"
              label="DEPARTMENT NAME"
              placeholder="e.g. Pediatrics"
              required
              readOnly={isViewMode}
              className="sm:col-span-2"
            />

            <FormField
              control={control}
              name="code"
              label="CODE IDENTIFIER"
              placeholder="e.g. PED-01"
              required
              readOnly={isViewMode}
            />

            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    DEPARTMENT STATUS
                  </Label>
                  <select
                    value={field.value ? "true" : "false"}
                    onChange={(e) => field.onChange(e.target.value === "true")}
                    disabled={isViewMode}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent text-foreground cursor-pointer"
                  >
                    <option value="true">Active Wing</option>
                    <option value="false">Inactive / Suspended</option>
                  </select>
                </div>
              )}
            />
          </div>
        </div>

        {/* Section 02 */}
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-2xs sm:p-6">
          {sectionHeader("02", "Clinical Overview & Description")}

          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  DESCRIPTION / SCOPE OF CARE
                </Label>
                <textarea
                  {...field}
                  value={field.value || ""}
                  rows={3}
                  placeholder="e.g. Specialized care for infants, children, and adolescents."
                  readOnly={isViewMode}
                  disabled={isViewMode}
                  className="w-full rounded-md border border-input bg-background p-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground placeholder:text-muted-foreground"
                />
              </div>
            )}
          />
        </div>
      </form>
    </FormContainer>
  )
}

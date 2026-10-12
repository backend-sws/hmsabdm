import { useCallback } from "react"
import type { UseMutationResult } from "@tanstack/react-query"
import { toast } from "sonner"

interface UseFormSubmitOptions {
  successMessage?: string
  onSuccess?: () => void
  onError?: (error: any) => void
}

/**
 * Standardized form submission handler.
 * Wraps mutateAsync with consistent success toast + close callback pattern.
 * Eliminates repetitive onSuccess/onError mutation handlers.
 *
 * @example
 * const { handleSubmit } = useFormSubmit(mutation, {
 *   successMessage: "Patient saved successfully",
 *   onSuccess: () => { onClose(); queryClient.invalidateQueries(...) }
 * })
 */
export function useFormSubmit<TData, TError, TVariables>(
  mutation: Pick<UseMutationResult<TData, TError, TVariables>, "mutateAsync" | "isPending">,
  options: UseFormSubmitOptions = {}
) {
  const { successMessage, onSuccess, onError } = options

  const handleSubmit = useCallback(
    async (variables: TVariables) => {
      try {
        await mutation.mutateAsync(variables)
        if (successMessage) {
          toast.success(successMessage)
        }
        onSuccess?.()
      } catch (error: any) {
        // Fallback — global MutationCache handler in App.tsx already handles toasts
        onError?.(error)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutation.mutateAsync, successMessage, onSuccess, onError]
  )

  return {
    handleSubmit,
    isPending: mutation.isPending,
  }
}

export default useFormSubmit

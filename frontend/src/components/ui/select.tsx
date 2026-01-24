import * as React from "react"
import { cn } from "@/lib/utils"

// Simplified Select implementation using native select
// Shadcn's Select is very complex to reimplement without Radix
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, onValueChange, onChange, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
            className
          )}
          onChange={(e) => {
            onChange?.(e);
            onValueChange?.(e.target.value);
          }}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {/* Custom arrow */}
        <div className="absolute right-3 top-3 pointer-events-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 opacity-50"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
    )
  }
)
Select.displayName = "Select"

const SelectTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>
const SelectValue = ({ placeholder }: { placeholder?: string }) => <>{placeholder}</>
const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>
const SelectItem = ({ value, children, ...props }: React.OptionHTMLAttributes<HTMLOptionElement> & { value: string }) => (
  <option value={value} {...props}>
    {children}
  </option>
)

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }

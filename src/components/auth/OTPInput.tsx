"use client"

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from "react"

interface OTPInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: boolean
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  error = false,
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  // Split value into array
  const valueArray = value.split("").slice(0, length)
  while (valueArray.length < length) {
    valueArray.push("")
  }

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, inputValue: string) => {
    // Only allow digits
    const digit = inputValue.replace(/\D/g, "").slice(-1)
    
    const newValue = [...valueArray]
    newValue[index] = digit
    onChange(newValue.join(""))

    // Move to next input if digit entered
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault()
      const newValue = [...valueArray]
      
      if (valueArray[index]) {
        // Clear current
        newValue[index] = ""
        onChange(newValue.join(""))
      } else if (index > 0) {
        // Move to previous and clear
        newValue[index - 1] = ""
        onChange(newValue.join(""))
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    
    if (pastedData) {
      onChange(pastedData.padEnd(length, "").slice(0, length))
      // Focus last filled input or the input after pasted content
      const focusIndex = Math.min(pastedData.length, length - 1)
      inputRefs.current[focusIndex]?.focus()
    }
  }

  return (
    <div className="flex gap-2 justify-center">
      {valueArray.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(null)}
          className={`
            w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 
            transition-all duration-200 outline-none
            ${disabled ? "bg-gray-100 cursor-not-allowed text-gray-400" : "bg-white"}
            ${error
              ? "border-red-500 text-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-200"
              : focusedIndex === index
                ? "border-violet-500 ring-2 ring-violet-200"
                : digit
                  ? "border-violet-400 text-violet-700"
                  : "border-gray-300 hover:border-gray-400"
            }
          `}
          aria-label={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  )
}

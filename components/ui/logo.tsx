import { Snowflake } from 'lucide-react'

interface LogoProps {
  className?: string
  showText?: boolean
}

export function Logo({ className = "h-8 w-8", showText = true }: LogoProps) {
  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <Snowflake className={`${className} text-blue-600`} />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full opacity-20 animate-pulse" />
      </div>
      {showText && (
        <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Presko
        </span>
      )}
    </div>
  )
}
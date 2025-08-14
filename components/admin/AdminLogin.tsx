// AdminLogin.tsx
'use client'

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { setAuthenticated, setCurrentAdmin } from '@/lib/features/admin/adminSlice'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AdminLogin() {
  const dispatch = useDispatch()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Login failed')
      }
      sessionStorage.setItem('presko_admin', JSON.stringify(data))
      dispatch(setCurrentAdmin(data))
      dispatch(setAuthenticated(true))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-500  to-[#99BCC0] via-[#8FB6BA] ">
      <div className="flex w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl">
        {/* Left Section: Illustration */}
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#99BCC0] via-[#8FB6BA] to-[#6fa3a9] items-center justify-center p-8 relative">
          <div className="text-white text-center">
            {/* You would place your SVG illustration here */}
            <img src = "../assets/images/presko_logo.png"/>
            <p className="mt-4 text-lg font-semibold">
              Login to your Admin Account
            </p>
          </div>
        </div>

        {/* Right Section: Login Form */}
        <Card className="w-full lg:w-1/2 p-10 flex flex-col justify-center rounded-none border-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Hello!</h1>
            <h2 className="text-2xl font-semibold text-gray-600">Greetings Admin</h2>
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-6">Login your account</p>
          <CardContent className="p-0">
            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-sm text-blue-500 hover:underline">
                    forget password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              {error && <div className="text-sm text-red-600">{error}</div>}
              <Button type="submit" className="w-full bg-[#99BCC0] hover:bg-[#8FB6BA]" disabled={loading}>
                {loading ? 'Signing in…' : 'Login'}
              </Button>
            </form>
            {/* <div className="mt-6 text-center">
              <a href="#" className="text-sm text-gray-500 hover:underline">
                Create Account
              </a>
            </div> */}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
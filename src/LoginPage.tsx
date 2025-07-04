import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginForm) => {
    setLoading(true)
    setError('')
    
    try {
      await auth.signIn({ email: values.email, password: values.password })
      if (!auth.error) {
        navigate('/dashboard')
      } else {
        setError(auth.error)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-200">
      <div className="flex flex-col md:flex-row w-full md:max-w-4xl bg-white rounded-none md:rounded-3xl shadow-2xl overflow-hidden animate-fade-in min-h-screen md:min-h-[auto]">
        {/* Illustration Side */}
        <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-blue-500 to-blue-700 p-8">
          <img
            src="https://undraw.co/api/illustrations/3b0b7e7e-2e7e-4e7e-8e7e-7e7e7e7e7e7e"
            alt="Login Illustration"
            className="w-72 h-72 object-contain mb-6 drop-shadow-xl animate-fade-in"
          />
          <h2 className="text-3xl font-bold text-white mb-2 tracking-wide">Welcome Back!</h2>
          <p className="text-blue-100 text-lg text-center">Sign in to access the GK App Admin Dashboard</p>
        </div>
        {/* Login Form Side */}
        <div className="w-full md:w-1/2 flex flex-col justify-center p-6 sm:p-10 min-h-screen md:min-h-0">
          <div className="mb-8 text-center">
            <span className="inline-block bg-blue-100 text-blue-700 px-4 py-1 rounded-full font-semibold text-sm mb-2 animate-pop">GK App Admin</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Sign in to your account</h2>
            <p className="text-gray-500">Enter your email and password below</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block mb-1 font-medium text-gray-700">Email</label>
              <input
                type="email"
                className={`w-full border-2 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
                {...register('email')}
                disabled={loading}
                autoComplete="email"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block mb-1 font-medium text-gray-700">Password</label>
              <input
                type="password"
                className={`w-full border-2 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition ${errors.password ? 'border-red-400' : 'border-gray-200'}`}
                {...register('password')}
                disabled={loading}
                autoComplete="current-password"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            {error && <p className="text-red-500 text-sm text-center animate-shake">{error}</p>}
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-lg shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                  Logging in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
      {/* Animations */}
      <style>{`
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(.4,0,.2,1) both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: none; } }
        .animate-pop { animation: popIn 0.5s cubic-bezier(.4,0,.2,1) both; }
        @keyframes popIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        .animate-shake { animation: shake 0.3s linear; }
        @keyframes shake { 10%, 90% { transform: translateX(-1px); } 20%, 80% { transform: translateX(2px); } 30%, 50%, 70% { transform: translateX(-4px); } 40%, 60% { transform: translateX(4px); } }
      `}</style>
    </div>
  )
} 
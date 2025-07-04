import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
// @ts-ignore: Allow JSX import of DashboardLayout.jsx
import DashboardLayout from './DashboardLayout'
import ExamBooksPage from './ExamBooksPage'
import LoginPage from './LoginPage'
import { supabase } from './supabaseClient'
// @ts-ignore: Allow JSX import of QuizSectionsPage.jsx
import QuizSectionsPage from './QuizSectionsPage'
import QuizCategoriesPage from './QuizCategoriesPage'
import QuizzesPage from './QuizzesPage'
import QuestionsPage from './QuestionsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const location = useLocation()

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<div>Welcome to the Dashboard!</div>} />
          <Route path="exam-books" element={<ExamBooksPage />} />
          <Route path="sections/:bookId" element={<QuizSectionsPage />} />
          <Route path="categories/:moduleCode" element={<QuizCategoriesPage />} />
          <Route path="quizzes/:segmentCode" element={<QuizzesPage />} />
          <Route path="questions/:internalQuizKey" element={<QuestionsPage />} />
          {/* Add more routes here as needed */}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

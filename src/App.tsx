import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
// @ts-ignore: Allow JSX import of DashboardLayout.jsx
import DashboardLayout from './DashboardLayout'
import DashboardHomePage from './DashboardHomePage'
import ExamBooksPage from './ExamBooksPage'
import LoginPage from './LoginPage'
// @ts-ignore: Allow JSX import of QuizSectionsPage.jsx
import QuizSectionsPage from './QuizSectionsPage'
import QuizCategoriesPage from './QuizCategoriesPage'
import QuizzesPage from './QuizzesPage'
import QuestionsPage from './QuestionsPage'
import QuestionReportsPage from './QuestionReportsPage'
import UsersPage from './UsersPage'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }
  
  if (!auth.user || !auth.isAdmin()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
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
            <Route path="dashboard" element={<DashboardHomePage />} />
            <Route path="exam-books" element={<ExamBooksPage />} />
            <Route path="sections/:bookId" element={<QuizSectionsPage />} />
            <Route path="categories/:moduleCode" element={<QuizCategoriesPage />} />
            <Route path="quizzes/:segmentCode" element={<QuizzesPage />} />
            <Route path="questions/:internalQuizKey" element={<QuestionsPage />} />
            <Route path="question-reports" element={<QuestionReportsPage />} />
            <Route path="users" element={<UsersPage />} />
            {/* Add more routes here as needed */}
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

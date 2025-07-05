import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from './supabaseClient'
import toast, { Toaster } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import CategoryAlertDialog from './atoms/CategoryAlertDialog'

// Type for a row in the exam_book table
export type ExamBook = {
  id: number,
  book_id: string,
  title: string
  subtitle: string
  icon: string // URL to image
  order: number
  total_category_hi: number
  total_category_en: number
}

// Zod schema for form validation
const examBookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().min(1, 'Subtitle is required'),
  icon: z.string().url('Icon must be a valid URL'),
  order: z.coerce.number().int().min(0),
  total_category_hi: z.coerce.number().int().min(0),
  total_category_en: z.coerce.number().int().min(0),
})
type ExamBookForm = z.infer<typeof examBookSchema>

const ROWS_PER_PAGE = 5

export default function ExamBooksPage() {
  const [books, setBooks] = useState<ExamBook[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [showCategoryAlert, setShowCategoryAlert] = useState(false)
  const [categoryAlertData, setCategoryAlertData] = useState<{ hi: number; en: number; title: string } | null>(null)
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExamBookForm>({
    resolver: zodResolver(examBookSchema),
  })

  // Fetch books from Supabase
  const fetchBooks = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('exam_book').select('*').order('order')
    if (error) {
      toast.error('Failed to fetch books')
    } else {
      setBooks(data as ExamBook[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBooks()
  }, [])

  // Add or update book
  const onSubmit = async (values: ExamBookForm) => {
    setLoading(true)
    let result
    if (editId) {
      result = await supabase.from('exam_book').update(values).eq('id', editId)
    } else {
      result = await supabase.from('exam_book').insert([values])
    }
    if (result.error) {
      toast.error(result.error.message)
    } else {
      toast.success(editId ? 'Book updated' : 'Book added')
      setOpen(false)
      reset()
      fetchBooks()
    }
    setLoading(false)
  }

  // Edit handler
  const handleEdit = (book: ExamBook) => {
    setEditId(book.id)
    reset(book)
    setOpen(true)
  }

  // Delete handler
  const handleDelete = async () => {
    if (deleteId == null) return
    
    // Find the book to get its data
    const bookToDelete = books.find(book => book.id === deleteId)
    if (!bookToDelete) {
      toast.error('Book not found')
      setDeleteId(null)
      return
    }

    // Check if the book has any categories
    console.log('Book to delete:', bookToDelete)
    console.log('Total category HI:', bookToDelete.total_category_hi)
    console.log('Total category EN:', bookToDelete.total_category_en)
    
    if (bookToDelete.total_category_hi > 0 || bookToDelete.total_category_en > 0) {
      console.log('Preventing deletion - categories exist')
      // Show custom alert dialog
      setCategoryAlertData({
        hi: bookToDelete.total_category_hi,
        en: bookToDelete.total_category_en,
        title: bookToDelete.title
      })
      setShowCategoryAlert(true)
      setDeleteId(null)
      return
    }
    
    console.log('Proceeding with deletion - no categories found')

    setDeleteLoading(true)
    
    try {
      // Proceed with deletion since no categories exist
      const { error } = await supabase.from('exam_book').delete().eq('id', deleteId)
      if (error) {
        console.error('Delete error details:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        toast.error(`Delete failed: ${error.message}`)
      } else {
        toast.success('Book deleted')
        fetchBooks()
      }
    } catch (error) {
      console.error('Unexpected error during deletion:', error)
      toast.error('An unexpected error occurred')
    }
    
    setDeleteLoading(false)
    setDeleteId(null)
  }

  // Modal close handler
  const handleClose = () => {
    setOpen(false)
    setEditId(null)
    reset()
  }

  // Pagination logic
  const totalPages = Math.ceil(books.length / ROWS_PER_PAGE)
  const paginatedBooks = books.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  return (
    <div className="relative">
      <Toaster />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-blue-900 tracking-tight">Exam Books</h1>
        <button
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          onClick={() => {
            setEditId(null);
            reset({
              title: '',
              subtitle: '',
              icon: '',
              order: 0,
              total_category_hi: 0,
              total_category_en: 0,
            });
            setOpen(true);
          }}
        >
          + Add Book
        </button>
      </div>
      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg relative animate-fade-in">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-blue-600 text-2xl font-bold"
              onClick={handleClose}
              aria-label="Close"
              type="button"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-6 text-blue-700">{editId ? 'Edit Book' : 'Add Book'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block mb-1 font-medium text-gray-700">Title</label>
                <input className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" {...register('title')} />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Subtitle</label>
                <input className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" {...register('subtitle')} />
                {errors.subtitle && <p className="text-red-500 text-xs mt-1">{errors.subtitle.message}</p>}
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Icon URL</label>
                <input className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" {...register('icon')} />
                {errors.icon && <p className="text-red-500 text-xs mt-1">{errors.icon.message}</p>}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block mb-1 font-medium text-gray-700">Order</label>
                  <input type="number" className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" {...register('order')} />
                  {errors.order && <p className="text-red-500 text-xs mt-1">{errors.order.message}</p>}
                </div>
                <div className="flex-1">
                  <label className="block mb-1 font-medium text-gray-700">Total Cat (HI)</label>
                  <input type="number" className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" {...register('total_category_hi')} />
                  {errors.total_category_hi && <p className="text-red-500 text-xs mt-1">{errors.total_category_hi.message}</p>}
                </div>
                <div className="flex-1">
                  <label className="block mb-1 font-medium text-gray-700">Total Cat (EN)</label>
                  <input type="number" className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" {...register('total_category_en')} />
                  {errors.total_category_en && <p className="text-red-500 text-xs mt-1">{errors.total_category_en.message}</p>}
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold shadow hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                  disabled={loading}
                >
                  {editId ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
          <style>{`
            .animate-fade-in { animation: fadeIn 0.5s cubic-bezier(.4,0,.2,1) both; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: none; } }
          `}</style>
        </div>
      )}
      {/* Delete Confirmation Dialog */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm relative animate-fade-in">
            <h2 className="text-xl font-bold mb-4 text-red-600">Confirm Delete</h2>
            <p className="mb-6 text-gray-700">Are you sure you want to delete this book? This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold"
                onClick={() => setDeleteId(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg font-semibold shadow hover:from-red-600 hover:to-pink-600 transition-all duration-200"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
          <style>{`
            .animate-fade-in { animation: fadeIn 0.5s cubic-bezier(.4,0,.2,1) both; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: none; } }
          `}</style>
        </div>
      )}

      {/* Category Alert Dialog */}
      <CategoryAlertDialog
        isOpen={showCategoryAlert}
        onClose={() => setShowCategoryAlert(false)}
        data={categoryAlertData}
      />
      {/* Responsive Table with Pagination */}
      <div className="overflow-x-auto rounded-2xl shadow-lg bg-white">
        <table className="min-w-full text-sm text-left text-gray-800">
          <thead className="bg-gradient-to-r from-blue-600 to-blue-400 text-white">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Icon</th>
              <th className="px-4 py-3 text-left font-semibold">Title</th>
              <th className="px-4 py-3 text-left font-semibold">Subtitle</th>
              <th className="px-4 py-3 text-left font-semibold">Order</th>
              <th className="px-4 py-3 text-left font-semibold">Total Cat (HI)</th>
              <th className="px-4 py-3 text-left font-semibold">Total Cat (EN)</th>
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBooks.map(book => (
              <tr
                key={book.id}
                className="border-b hover:bg-blue-50 transition cursor-pointer group"
                onClick={e => {
                  // Prevent navigation if clicking on a button
                  if ((e.target as HTMLElement).closest('button')) return;
                  navigate(`/sections/${book.book_id}`);
                }}
              >
                <td className="px-4 py-3">
                  <img src={book.icon} alt="icon" className="w-12 h-12 object-contain rounded-lg shadow border" />
                </td>
                <td className="px-4 py-3 font-semibold text-blue-900">{book.title}</td>
                <td className="px-4 py-3 text-gray-700">{book.subtitle}</td>
                <td className="px-4 py-3 text-blue-700 font-bold">{book.order}</td>
                <td className="px-4 py-3 text-blue-700">{book.total_category_hi}</td>
                <td className="px-4 py-3 text-blue-700">{book.total_category_en}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    className="px-3 py-1 bg-yellow-400 text-white rounded-lg font-semibold shadow hover:bg-yellow-500 transition"
                    onClick={e => { e.stopPropagation(); handleEdit(book); }}
                  >
                    Edit
                  </button>
                  <button
                    className="px-3 py-1 bg-red-600 text-white rounded-lg font-semibold shadow hover:bg-red-700 transition"
                    onClick={e => { e.stopPropagation(); setDeleteId(book.id); }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {paginatedBooks.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">No books found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-blue-100 disabled:opacity-50"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-blue-100 disabled:opacity-50"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
} 
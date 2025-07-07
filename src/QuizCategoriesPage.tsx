import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from './supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from './components/ui/dialog';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './components/ui/table';
import { v4 as uuidv4 } from 'uuid';
import CategoryDeleteAlertDialog from './atoms/CategoryDeleteAlertDialog';

// Types
export type QuizCategory = {
  id: number;
  created_at: string;
  moduleCode: string;
  moduleTitle: string;
  segmentTitle: string;
  segmentCode: string;
  displayOrder: number;
  categoryStatus: number;
  questionVolume?: number | null;
  setCount?: number | null;
  languageCode: string;
  sectionRef: string;
};

export type QuizSection = {
  id: number;
  moduleCode: string;
  moduleTitle: string;
};

const categoryStatusOptions = [
  { label: 'Live', value: 1 },
  { label: 'Draft', value: 0 },
];

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Hindi', value: 'hi' },
];

const quizCategorySchema = z.object({
  segmentTitle: z.string().min(1, 'Segment Title is required'),
  displayOrder: z.coerce.number().int().min(0),
  categoryStatus: z.coerce.number().int().min(0).max(1),
  languageCode: z.string().min(1, 'Language is required'),
  moduleCode: z.string().min(1),
  moduleTitle: z.string().min(1),
});
type QuizCategoryForm = z.infer<typeof quizCategorySchema>;

export default function QuizCategoriesPage() {
  const params = useParams<{ moduleCode: string }>();
  const [searchParams] = useSearchParams();
  const moduleCode = params.moduleCode;
  const languageCode = searchParams.get('lang') || 'en';
  const bookRef = searchParams.get('bookRef') || '';
  const navigate = useNavigate();
  const [categories, setCategories] = useState<QuizCategory[]>([]);
  const [sections, setSections] = useState<QuizSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState<QuizSection | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showCategoryDeleteAlert, setShowCategoryDeleteAlert] = useState(false);
  const [categoryDeleteAlertData, setCategoryDeleteAlertData] = useState<{ setCount: number; questionVolume: number; title: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuizCategoryForm>({
    resolver: zodResolver(quizCategorySchema),
    defaultValues: {
      categoryStatus: 1,
      languageCode: languageCode,
      displayOrder: 0,
      moduleCode: moduleCode || '',
      moduleTitle: '',
    },
  });

  // Fetch categories
  const fetchCategories = async () => {
    if (!moduleCode) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('quiz_categories')
      .select('*')
      .eq('moduleCode', moduleCode)
      .eq('languageCode', languageCode)
      .order('displayOrder');
    if (error) {
      toast.error('Failed to fetch categories');
    } else {
      setCategories((data as QuizCategory[]) || []);
    }
    setLoading(false);
  };

  // Fetch sections for dropdown
  const fetchSections = async () => {
    if (!moduleCode) return;
    const { data, error } = await supabase
      .from('quiz_sections')
      .select('id, moduleCode, moduleTitle')
      .eq('moduleCode', moduleCode)
      .order('moduleTitle');
    if (!error && data) {
      setSections(data as QuizSection[]);
      // Set default selected section for dialog
      if (data.length > 0) {
        setSelectedSection(data[0]);
        setValue('moduleCode', data[0].moduleCode);
        setValue('moduleTitle', data[0].moduleTitle);
      }
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchSections();
    // eslint-disable-next-line
  }, [moduleCode, languageCode]);

  // Add or update category
  const onSubmit = async (values: QuizCategoryForm) => {
    setFormLoading(true);
    const insertData = {
      ...values,
    };
    if (!editId) {
      // Only generate segmentCode for new category
      (insertData as any).segmentCode = uuidv4();
    }
    let error;
    if (editId) {
      // Update
      const { error: updateError } = await supabase
        .from('quiz_categories')
        .update(insertData)
        .eq('id', editId);
      error = updateError;
    } else {
      // Insert
      const { error: insertError } = await supabase
        .from('quiz_categories')
        .insert([insertData]);
      error = insertError;
    }
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editId ? 'Category updated' : 'Category added');
      setOpen(false);
      setEditId(null);
      reset();
      fetchCategories();
    }
    setFormLoading(false);
  };

  // Delete category
  const handleDelete = async () => {
    if (!deleteId) return;
    
    // Find the category to get its data
    const categoryToDelete = categories.find(category => category.id.toString() === deleteId);
    if (!categoryToDelete) {
      toast.error('Category not found');
      setDeleteId(null);
      return;
    }

    // Check if the category has any sets or questions
    const hasSets = categoryToDelete.setCount && categoryToDelete.setCount > 0;
    const hasQuestions = categoryToDelete.questionVolume && categoryToDelete.questionVolume > 0;

    if (hasSets || hasQuestions) {
      // Show custom alert dialog
      setCategoryDeleteAlertData({
        setCount: categoryToDelete.setCount || 0,
        questionVolume: categoryToDelete.questionVolume || 0,
        title: categoryToDelete.segmentTitle
      });
      setShowCategoryDeleteAlert(true);
      setDeleteId(null);
      return;
    }

    setDeleteLoading(true);
    
    try {
      // Proceed with deletion since no sets or questions exist
      const { error } = await supabase.from('quiz_categories').delete().eq('id', deleteId);
      if (error) {
        toast.error('Delete failed');
      } else {
        toast.success('Category deleted');
        fetchCategories();
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    }
    
    setDeleteLoading(false);
    setDeleteId(null);
  };

  // Get moduleTitle for heading
  const moduleTitle = selectedSection?.moduleTitle || sections[0]?.moduleTitle || moduleCode;

  return (
    <div className="relative w-full">
      <Toaster />
      <h2 className="text-2xl font-bold mb-6">Categories for Module: <span className="text-blue-600">{moduleTitle}</span></h2>
      <div className="flex items-center justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                // Reset and set default section
                if (sections.length > 0) {
                  reset({
                    segmentTitle: '',
                    displayOrder: categories.length + 1,
                    categoryStatus: 1,
                    languageCode: languageCode,
                    moduleCode: sections[0].moduleCode,
                    moduleTitle: sections[0].moduleTitle,
                  });
                  setSelectedSection(sections[0]);
                } else {
                  reset();
                  setSelectedSection(null);
                }
                setEditId(null);
              }}
              className="px-6 py-2 font-semibold"
            >
              + Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block mb-1 font-medium text-gray-700">Category Title</label>
                <Input {...register('segmentTitle')} placeholder="Category Title" />
                {errors.segmentTitle && <p className="text-red-500 text-xs mt-1">{errors.segmentTitle.message}</p>}
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Display Order</label>
                <Input type="number" {...register('displayOrder', { valueAsNumber: true })} />
                {errors.displayOrder && <p className="text-red-500 text-xs mt-1">{errors.displayOrder.message}</p>}
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Category Status</label>
                <select className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" {...register('categoryStatus', { valueAsNumber: true })}>
                  {categoryStatusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.categoryStatus && <p className="text-red-500 text-xs mt-1">{errors.categoryStatus.message}</p>}
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Language</label>
                <select className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" {...register('languageCode')}>
                  {languageOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.languageCode && <p className="text-red-500 text-xs mt-1">{errors.languageCode.message}</p>}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" onClick={() => { setOpen(false); setEditId(null); }} disabled={formLoading}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? (editId ? 'Updating...' : 'Adding...') : (editId ? 'Update' : 'Add')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {/* Table */}
      <div className="overflow-x-auto rounded-2xl shadow bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Segment Title</TableHead>
              <TableHead>Display Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Question Volume</TableHead>
              <TableHead>Set Count</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">Loading...</TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">No categories found.</TableCell>
              </TableRow>
            ) : (
              categories.map(category => (
                <TableRow key={category.id}>
                  <TableCell
                    className="cursor-pointer hover:bg-blue-50"
                    onClick={() => navigate(`/quizzes/${category.segmentCode}?bookRef=${bookRef}&segmentCode=${category.segmentCode}&lang=${category.languageCode}`)}
                  >
                    {category.segmentTitle}
                  </TableCell>
                  <TableCell>{category.displayOrder}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${category.categoryStatus === 1 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {categoryStatusOptions.find(opt => opt.value === category.categoryStatus)?.label || category.categoryStatus}
                    </span>
                  </TableCell>
                  <TableCell>{category.questionVolume ?? '-'}</TableCell>
                  <TableCell>{category.setCount ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => {
                        setEditId(category.id.toString());
                        reset({
                          segmentTitle: category.segmentTitle,
                          displayOrder: category.displayOrder,
                          categoryStatus: category.categoryStatus,
                          languageCode: category.languageCode,
                          moduleCode: category.moduleCode,
                          moduleTitle: category.moduleTitle,
                        });
                        setOpen(true);
                      }}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteId(category.id.toString())}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="mb-4">Are you sure you want to delete this category?</div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" onClick={() => setDeleteId(null)} disabled={deleteLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Delete Alert Dialog */}
      <CategoryDeleteAlertDialog
        isOpen={showCategoryDeleteAlert}
        onClose={() => setShowCategoryDeleteAlert(false)}
        data={categoryDeleteAlertData}
      />
    </div>
  );
} 
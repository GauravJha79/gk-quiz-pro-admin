import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from './supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
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
import SetAlertDialog from './atoms/SetAlertDialog';


// Type for a row in the quiz_sections table
export type QuizSection = {
  id: number;
  created_at: string;
  moduleCode: string;
  moduleTitle: string;
  sectionStatus: number;
  liveTimestamp: string | null;
  displayOrder: number;
  questionVolume: number | null;
  iconLink: string | null;
  bookRef: string;
  languageCode: string;
  setCount: number | null;
};

const sectionStatusOptions = [
  { label: 'Live', value: 1 },
  { label: 'Draft', value: 0 },
];

const quizSectionSchema = z.object({
  moduleCode: z.string().min(1, 'Module Code is required'),
  moduleTitle: z.string().min(1, 'Module Title is required'),
  sectionStatus: z.coerce.number().int().min(0).max(1),
  displayOrder: z.coerce.number().int().min(0),
  iconLink: z.string().min(1, 'Icon Link is required').url('Icon must be a valid URL'),
  bookRef: z.string().min(1, 'Book Ref is required'),
  languageCode: z.string().min(1, 'Language Code is required'),
});
type QuizSectionForm = z.infer<typeof quizSectionSchema>;

export default function QuizSectionsPage({ bookId: propBookId }: { bookId?: string }) {
  const params = useParams<{ bookId: string }>();
  const bookId = propBookId || params.bookId;
  const [sections, setSections] = useState<QuizSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showSetAlert, setShowSetAlert] = useState(false);
  const [setAlertData, setSetAlertData] = useState<{ setCount: number; title: string } | null>(null);
  const navigate = useNavigate();
  const [language, setLanguage] = useState<string>('hi');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<QuizSectionForm>({
    resolver: zodResolver(quizSectionSchema),
  });

  // Fetch sections from Supabase
  const fetchSections = async (lang = language) => {
    if (!bookId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('quiz_sections')
      .select('*')
      .eq('bookRef', bookId)
      .eq('languageCode', lang)
      .order('displayOrder');
    if (error) {
      toast.error('Failed to fetch sections');
    } else {
      setSections((data as QuizSection[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSections(language);
    // eslint-disable-next-line
  }, [bookId, language]);

  // Add or update section
  const onSubmit = async (values: QuizSectionForm) => {
    setLoading(true);

    let result;
    
    if (editId) {
      // Don't update moduleCode on edit
      const { moduleCode, ...updateValues } = values;
      result = await supabase.from('quiz_sections').update(updateValues).eq('id', editId);
    } else {
      // Add liveTimestamp only when creating new section
      const newSectionData = {
        ...values,
        liveTimestamp: new Date().toISOString()
      };
      result = await supabase.from('quiz_sections').insert([newSectionData]);
    }
    if (result.error) {
      toast.error(result.error.message);
    } else {
      toast.success(editId ? 'Section updated' : 'Section added');
      setOpen(false);
      reset();
      fetchSections();
    }
    setLoading(false);
  };

  // Edit handler
  const handleEdit = (section: QuizSection) => {
    setEditId(section.id);
    reset({
      ...section,
      iconLink: section.iconLink || '', // Convert null to empty string for form
    });
    setOpen(true);
  };

  // Delete handler
  const handleDelete = async () => {
    if (deleteId == null) return;
    
    // Find the section to get its data
    const sectionToDelete = sections.find(section => section.id === deleteId);
    if (!sectionToDelete) {
      toast.error('Section not found');
      setDeleteId(null);
      return;
    }

    // Check if the section has any sets
    if (sectionToDelete.setCount && sectionToDelete.setCount > 0) {
      // Show custom alert dialog
      setSetAlertData({
        setCount: sectionToDelete.setCount,
        title: sectionToDelete.moduleTitle
      });
      setShowSetAlert(true);
      setDeleteId(null);
      return;
    }

    setDeleteLoading(true);
    
    try {
      // Proceed with deletion since no sets exist
      const { error } = await supabase.from('quiz_sections').delete().eq('id', deleteId);
      if (error) {
        toast.error('Delete failed');
      } else {
        toast.success('Section deleted');
        fetchSections();
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    }
    
    setDeleteLoading(false);
    setDeleteId(null);
  };

  // Modal close handler
  const handleClose = () => {
    setOpen(false);
    setEditId(null);
    reset();
  };

  return (
    <div className="relative w-full">
      <Toaster />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <label htmlFor="language-select" className="font-medium">Language:</label>
          <select
            id="language-select"
            className="border-2 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={language}
            onChange={e => setLanguage(e.target.value)}
          >
            <option value="hi">Hindi</option>
            <option value="en">English</option>
          </select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditId(null);
                reset({
                  moduleCode: uuidv4(),
                  moduleTitle: '',
                  sectionStatus: 1,
                  displayOrder: sections.length + 1,
                  iconLink: '',
                  bookRef: bookId || '',
                  languageCode: language,
                });
              }}
              className="px-6 py-2 font-semibold"
            >
              + Add Section
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Section' : 'Add Section'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Module Code is not shown as an input field anymore */}
              <div>
                <label className="block mb-1 font-medium text-gray-700">Module Title</label>
                <Input {...register('moduleTitle')} />
                {errors.moduleTitle && <p className="text-red-500 text-xs mt-1">{errors.moduleTitle.message}</p>}
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Section Status</label>
                <select className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" {...register('sectionStatus', { valueAsNumber: true })}>
                  {sectionStatusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.sectionStatus && <p className="text-red-500 text-xs mt-1">{errors.sectionStatus.message}</p>}
              </div>

              <div>
                <label className="block mb-1 font-medium text-gray-700">Display Order</label>
                <Input type="number" {...register('displayOrder')} />
                {errors.displayOrder && <p className="text-red-500 text-xs mt-1">{errors.displayOrder.message}</p>}
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Icon Link <span className="text-red-500">*</span></label>
                <Input {...register('iconLink')} placeholder="Enter icon URL" />
                {errors.iconLink && <p className="text-red-500 text-xs mt-1">{errors.iconLink.message}</p>}
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Language</label>
                <select
                  className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  {...register('languageCode')}
                  value={undefined} // Let react-hook-form control the value
                  onChange={e => setValue('languageCode', e.target.value)}
                >
                  <option value="hi">Hindi</option>
                  <option value="en">English</option>
                </select>
                {errors.languageCode && <p className="text-red-500 text-xs mt-1">{errors.languageCode.message}</p>}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={loading}>
                  {editId ? 'Update' : 'Add'}
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
              <TableHead>Icon</TableHead>
              <TableHead>Module Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Set Count</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">Loading...</TableCell>
              </TableRow>
            ) : sections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">No sections found.</TableCell>
              </TableRow>
            ) : (
              sections.map(section => (
                <TableRow
                  key={section.id}
                  className="cursor-pointer hover:bg-blue-50"
                  onClick={e => {
                    // Prevent navigation if clicking on an action button
                    if ((e.target as HTMLElement).closest('button')) return;
                    navigate(`/categories/${section.moduleCode}?lang=${section.languageCode}&bookRef=${bookId}`);
                  }}
                >
                  <TableCell>
                    {section.iconLink ? (
                      <img src={section.iconLink} alt="icon" className="w-10 h-10 object-contain rounded shadow border bg-gray-50" />
                    ) : (
                      <span className="text-gray-400">No Icon</span>
                    )}
                  </TableCell>
                  <TableCell>{section.moduleTitle}</TableCell>
                  <TableCell>{sectionStatusOptions.find(opt => opt.value === section.sectionStatus)?.label || section.sectionStatus}</TableCell>
                  <TableCell>{section.displayOrder}</TableCell>
                  <TableCell>{section.setCount || 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => handleEdit(section)}>
                        Edit
                      </Button>
                      <Button variant="destructive" onClick={() => setDeleteId(section.id)}>
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
      <Dialog open={deleteId !== null} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="mb-4">Are you sure you want to delete this section?</div>
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

      {/* Set Alert Dialog */}
      <SetAlertDialog
        isOpen={showSetAlert}
        onClose={() => setShowSetAlert(false)}
        data={setAlertData}
      />
    </div>
  );
} 
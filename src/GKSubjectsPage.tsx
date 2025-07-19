import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from './supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
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
import { Loader2, Plus, Edit, Trash2, ArrowRight } from 'lucide-react';
import DeleteConfirmDialog from './atoms/DeleteConfirmDialog';
import { useParams, useLocation } from 'react-router-dom';

// Types
export type GKSubject = {
  id: string;
  title: string;
  language_code: string;
  created_at: string;
};

const subjectSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  language_code: z.string().min(1, 'Language is required'),
});

type SubjectForm = z.infer<typeof subjectSchema>;

interface GKSubjectsPageProps {
  languageCode: string;
}

export default function GKSubjectsPage({ languageCode }: GKSubjectsPageProps) {
  const navigate = useNavigate();
  // ✅ If you need params or location, put them here:
  // const { topicId } = useParams();
  // const query = new URLSearchParams(useLocation().search);
  // const languageCode = query.get('language');
  const [subjects, setSubjects] = useState<GKSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('hi');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SubjectForm>({
    resolver: zodResolver(subjectSchema),
  });

  // Fetch subjects
  const fetchSubjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gk_subjects')
      .select('*')
      .eq('language_code', selectedLanguage)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Failed to fetch subjects');
    } else {
      setSubjects((data as GKSubject[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubjects();
  }, [selectedLanguage]);

  // Add or update subject
  const onSubmit = async (values: SubjectForm) => {
    setFormLoading(true);
    const insertData = {
      ...values,
    };

    let error;
    if (editId) {
      // Update
      const { error: updateError } = await supabase
        .from('gk_subjects')
        .update(insertData)
        .eq('id', editId);
      error = updateError;
    } else {
      // Insert
      const { error: insertError } = await supabase
        .from('gk_subjects')
        .insert([insertData]);
      error = insertError;
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editId ? 'Subject updated' : 'Subject added');
      setOpen(false);
      setEditId(null);
      reset();
      fetchSubjects();
    }
    setFormLoading(false);
  };

  // Handle edit
  const handleEdit = (subject: GKSubject) => {
    setEditId(subject.id);
    setValue('title', subject.title);
    setValue('language_code', subject.language_code);
    setOpen(true);
  };

  // Handle add
  const handleAdd = () => {
    setEditId(null);
    reset({ title: '', language_code: selectedLanguage });
    setOpen(true);
  };

  // Delete subject
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    const { error } = await supabase
      .from('gk_subjects')
      .delete()
      .eq('id', deleteId);
    
    if (error) {
      toast.error('Delete failed: ' + error.message);
    } else {
      toast.success('Subject deleted');
      fetchSubjects();
    }
    setDeleteLoading(false);
    setDeleteId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewTopics = (subjectId: string) => {
    navigate(`/gk-topics/${subjectId}`);
  };

  return (
    <div className="space-y-8">
      <Toaster />
      {/* Header */}
      <div className="flex items-center justify-between bg-white border rounded-lg shadow-sm px-6 py-4 mb-4">
        <div className="flex items-center gap-4">
          <label htmlFor="language-filter" className="text-sm font-medium">Language:</label>
          <select
            id="language-filter"
            value={selectedLanguage}
            onChange={e => setSelectedLanguage(e.target.value)}
            className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="hi">Hindi</option>
            <option value="en">English</option>
          </select>
        </div>
        <h2 className="text-2xl font-bold text-center flex-1">GK Subjects</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} className="px-6 py-2 font-semibold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold mb-2">{editId ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Title
                </label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Enter subject title"
                  className={`transition ${errors.title ? 'border-red-500' : ''}`}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="language_code" className="text-sm font-medium">
                  Language
                </label>
                <select
                  id="language_code"
                  {...register('language_code')}
                  className={`block w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.language_code ? 'border-red-500' : ''}`}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </select>
                {errors.language_code && (
                  <p className="text-sm text-red-500">{errors.language_code.message}</p>
                )}
              </div>
              <DialogFooter className="flex gap-2 justify-end mt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="transition">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={formLoading} className="bg-blue-600 hover:bg-blue-700 text-white transition">
                  {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editId ? 'Update' : 'Add'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {/* Table */}
      <div className="border rounded-lg shadow overflow-x-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Title</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="w-[180px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                </TableCell>
              </TableRow>
            ) : subjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12 text-muted-foreground text-lg">
                  No subjects found
                </TableCell>
              </TableRow>
            ) : (
              subjects.map((subject, idx) => (
                <TableRow
                  key={subject.id}
                  onClick={() => handleViewTopics(subject.id)}
                  className="cursor-pointer hover:bg-blue-50 transition"
                >
                  <TableCell className="font-medium">{subject.title}</TableCell>
                  <TableCell>{formatDate(subject.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => { e.stopPropagation(); handleEdit(subject); }}
                        className="hover:bg-yellow-50 text-yellow-600 hover:text-yellow-700 transition"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => { e.stopPropagation(); setDeleteId(subject.id); }}
                        className="hover:bg-red-50 text-red-600 hover:text-red-700 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
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
      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Subject"
        description="Are you sure you want to delete this subject? This action cannot be undone."
      />
    </div>
  );
} 
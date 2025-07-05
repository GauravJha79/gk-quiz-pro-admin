import React, { useEffect, useState, useMemo } from 'react';
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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from './components/ui/table';
import { Loader2, Plus, Pencil, Image as ImageIcon, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import QuizDeleteAlertDialog from './atoms/QuizDeleteAlertDialog';

// Types
export type Quiz = {
  internalQuizKey: string;
  quizTitle: string;
  quizStatus: number; // 1 = Live, 0 = Draft
  languageCode: string; // 'en' | 'hi'
  coverImageLink: string;
  segmentCode: string;
  segmentRef: string;
  segmentTitle?: string;
  questionVolume?: number | null;
  created_at?: string;
};

export type QuizCategory = {
  segmentCode: string;
  segmentTitle: string;
};

const quizStatusOptions = [
  { label: 'Live', value: 1 },
  { label: 'Draft', value: 0 },
];

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Hindi', value: 'hi' },
];

const quizSchema = z.object({
  quizTitle: z.string().min(1, 'Quiz Title is required'),
  quizStatus: z.coerce.number().int().min(0).max(1),
  languageCode: z.string().min(1, 'Language is required'),
  segmentRef: z.string().min(1, 'Segment is required'), // stores segmentCode
});
type QuizForm = z.infer<typeof quizSchema>;

interface QuizzesPageProps {
  segmentCode?: string;
}

const QuizzesPage: React.FC<QuizzesPageProps> = ({ segmentCode: propSegmentCode }) => {
  const params = useParams<{ segmentCode: string }>();
  const [searchParams] = useSearchParams();
  const segmentCode = propSegmentCode || params.segmentCode;
  const bookRef = searchParams.get('bookRef') || '';
  const segmentCodeParam = searchParams.get('segmentCode') || segmentCode;
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [segments, setSegments] = useState<QuizCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showQuizDeleteAlert, setShowQuizDeleteAlert] = useState(false);
  const [quizDeleteAlertData, setQuizDeleteAlertData] = useState<{ questionVolume: number; title: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuizForm>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      quizStatus: 1,
      languageCode: 'en',
      quizTitle: '',
      segmentRef: '',
    },
  });

  // Fetch quizzes for the segment
  const fetchQuizzes = async () => {
    if (!segmentCode) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('segmentCode', segmentCode)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to fetch quizzes');
    } else {
      setQuizzes((data as Quiz[]) || []);
    }
    setLoading(false);
  };

  // Fetch all segments for the selector
  const fetchSegments = async () => {
    const { data, error } = await supabase
      .from('quiz_categories')
      .select('segmentCode, segmentTitle')
      .order('segmentTitle');
    if (!error && data) {
      setSegments(data as QuizCategory[]);
      // Preselect segment if available
      if (segmentCode) {
        const found = data.find((s: QuizCategory) => s.segmentCode === segmentCode);
        if (found) setValue('segmentRef', found.segmentCode);
      }
    }
  };

  useEffect(() => {
    fetchQuizzes();
    fetchSegments();
    // eslint-disable-next-line
  }, [segmentCode]);

  // Add or update quiz
  const onSubmit = async (values: QuizForm) => {
    setFormLoading(true);
    // Find the selected segment object
    const selectedSegmentObj = segments.find(seg => seg.segmentCode === values.segmentRef);
    const segmentTitle = selectedSegmentObj ? selectedSegmentObj.segmentTitle : '';
    let error;
    if (editId) {
      // Update
      const { error: updateError } = await supabase
        .from('quizzes')
        .update({
          quizTitle: values.quizTitle,
          quizStatus: values.quizStatus,
          languageCode: values.languageCode,
          segmentCode: values.segmentRef,
          segmentTitle,
        })
        .eq('internalQuizKey', editId);
      error = updateError;
    } else {
      // Insert
      const { error: insertError } = await supabase
        .from('quizzes')
        .insert([{ 
          quizTitle: values.quizTitle,
          quizStatus: values.quizStatus,
          languageCode: values.languageCode,
          segmentCode: values.segmentRef,
          segmentTitle,
          internalQuizKey: uuidv4(),
        }]);
      error = insertError;
    }
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editId ? 'Quiz updated' : 'Quiz added');
      setOpen(false);
      setEditId(null);
      reset();
      fetchQuizzes();
    }
    setFormLoading(false);
  };

  // Edit quiz
  const handleEdit = (quiz: Quiz) => {
    setEditId(quiz.internalQuizKey);
    reset({
      quizTitle: quiz.quizTitle,
      quizStatus: quiz.quizStatus,
      languageCode: quiz.languageCode,
      segmentRef: quiz.segmentCode,
    });
    setOpen(true);
  };

  const selectedSegment = useMemo(
    () => segments.find((s) => s.segmentCode === watch('segmentRef')),
    [segments, watch('segmentRef')]
  );

  // Delete quiz
  const handleDelete = async () => {
    if (!deleteId) return;
    
    // Find the quiz to get its data
    const quizToDelete = quizzes.find(quiz => quiz.internalQuizKey === deleteId);
    if (!quizToDelete) {
      toast.error('Quiz not found');
      setDeleteId(null);
      return;
    }

    // Check if the quiz has any questions
    if (quizToDelete.questionVolume && quizToDelete.questionVolume > 0) {
      // Show custom alert dialog
      setQuizDeleteAlertData({
        questionVolume: quizToDelete.questionVolume,
        title: quizToDelete.quizTitle
      });
      setShowQuizDeleteAlert(true);
      setDeleteId(null);
      return;
    }

    setDeleteLoading(true);
    
    try {
      // Proceed with deletion since no questions exist
      const { error } = await supabase.from('quizzes').delete().eq('internalQuizKey', deleteId);
      if (error) {
        toast.error('Delete failed');
      } else {
        toast.success('Quiz deleted');
        fetchQuizzes();
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    }
    
    setDeleteLoading(false);
    setDeleteId(null);
  };

  return (
    <div className="relative w-full">
      <Toaster />
      <h2 className="text-2xl font-bold mb-6">Quizzes for Segment: <span className="text-blue-600">{selectedSegment?.segmentTitle || ''}</span></h2>
      <div className="flex items-center justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                reset({
                  quizTitle: '',
                  quizStatus: 1,
                  languageCode: 'en',
                  segmentRef: segmentCode || '',
                });
                setEditId(null);
              }}
              className="px-6 py-2 font-semibold flex gap-2 items-center"
            >
              <Plus className="w-4 h-4" /> Add Quiz
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Quiz' : 'Add Quiz'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block mb-1 font-medium text-gray-700">Quiz Title</label>
                <Input {...register('quizTitle')} placeholder="Quiz Title" />
                {errors.quizTitle && <p className="text-red-500 text-xs mt-1">{errors.quizTitle.message}</p>}
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Quiz Status</label>
                <select className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" {...register('quizStatus', { valueAsNumber: true })}>
                  {quizStatusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.quizStatus && <p className="text-red-500 text-xs mt-1">{errors.quizStatus.message}</p>}
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
              <div>
                <label className="block mb-1 font-medium text-gray-700">Segment</label>
                <select className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" {...register('segmentRef')}>
                  <option value="">Select Segment</option>
                  {segments.map(seg => (
                    <option key={seg.segmentCode} value={seg.segmentCode}>{seg.segmentTitle}</option>
                  ))}
                </select>
                {errors.segmentRef && <p className="text-red-500 text-xs mt-1">{errors.segmentRef.message}</p>}
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
              <TableHead>Quiz Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                  <Loader2 className="mx-auto animate-spin w-6 h-6" />
                </TableCell>
              </TableRow>
            ) : quizzes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-400">No quizzes found.</TableCell>
              </TableRow>
            ) : (
              quizzes.map(quiz => (
                <TableRow
                  key={quiz.internalQuizKey}
                  className="cursor-pointer hover:bg-blue-50"
                  onClick={e => {
                    // Prevent navigation if clicking on an action button
                    if ((e.target as HTMLElement).closest('button')) return;
                    navigate(`/questions/${quiz.internalQuizKey}?bookRef=${bookRef}&segmentCode=${segmentCodeParam}`);
                  }}
                >
                  <TableCell>{quiz.quizTitle}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${quiz.quizStatus === 1 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {quizStatusOptions.find(opt => opt.value === quiz.quizStatus)?.label || quiz.quizStatus}
                    </span>
                  </TableCell>
                  <TableCell>{languageOptions.find(opt => opt.value === quiz.languageCode)?.label || quiz.languageCode}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleEdit(quiz)}>
                        <Pencil className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteId(quiz.internalQuizKey)}>
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
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
            <DialogTitle>Delete Quiz</DialogTitle>
          </DialogHeader>
          <div className="mb-4 flex flex-col items-center text-center">
            <Trash2 className="w-12 h-12 text-red-500 mb-2" />
            <div className="text-lg font-semibold mb-2">Are you sure you want to delete this quiz?</div>
            <div className="text-gray-500 mb-2">This action cannot be undone.</div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" onClick={() => setDeleteId(null)} disabled={deleteLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quiz Delete Alert Dialog */}
      <QuizDeleteAlertDialog
        isOpen={showQuizDeleteAlert}
        onClose={() => setShowQuizDeleteAlert(false)}
        data={quizDeleteAlertData}
      />
    </div>
  );
};

export default QuizzesPage; 
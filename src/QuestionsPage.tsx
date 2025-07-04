import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from './supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import ReactMarkdown from 'react-markdown';
import { Editor } from '@toast-ui/react-editor';
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
import { Loader2, Trash2 } from 'lucide-react';

// --- Types ---
export type Question = {
  questionId: string;
  quizId: string;
  questionType: number; // 1 = MCQ, 2 = True/False
  questionText: string;
  correctAnswer: 'a' | 'b' | 'c' | 'd';
  optionA: string;
  optionB: string;
  optionC?: string | null;
  optionD?: string | null;
  noteText?: string | null;
  previouslyAskedIn?: string | null;
  languageCode: 'en' | 'hi';
  created_at: string;
};

const questionSchema = z.object({
  questionType: z.union([z.literal(1), z.literal(2)]),
  correctAnswer: z.enum(['a', 'b', 'c', 'd'], {
    required_error: 'Please select the correct answer',
  }),
  optionA: z.string().min(1, 'Option A is required'),
  optionB: z.string().min(1, 'Option B is required'),
  optionC: z.string().optional().or(z.literal('')).nullable(),
  optionD: z.string().optional().or(z.literal('')).nullable(),
  previouslyAskedIn: z.string().optional().or(z.literal('')).nullable(),
  languageCode: z.enum(['en', 'hi']),
});
type QuestionForm = z.infer<typeof questionSchema>;

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Hindi', value: 'hi' },
];
const questionTypeOptions = [
  { label: 'Multiple Choice', value: 1 },
  { label: 'True/False', value: 2 },
];
const ROWS_PER_PAGE = 10;

interface QuestionsPageProps {
  internalQuizKey?: string;
}

const QuestionsPage: React.FC<QuestionsPageProps> = ({ internalQuizKey: propQuizKey }) => {
  const params = useParams<{ internalQuizKey: string }>();
  const quizId = propQuizKey || params.internalQuizKey;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [questionTextError, setQuestionTextError] = useState('');
  const questionEditorRef = useRef<any>(null);
  const noteEditorRef = useRef<any>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuestionForm>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      questionType: 1,
      correctAnswer: undefined,
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      previouslyAskedIn: '',
      languageCode: 'en',
    },
  });

  // --- Fetch Questions ---
  const fetchQuestions = async () => {
    if (!quizId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('quizId', quizId)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to fetch questions');
    } else {
      setQuestions((data as Question[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line
  }, [quizId]);

  // --- Add/Edit Question ---
  const onSubmit = async (values: QuestionForm) => {
    setFormLoading(true);
    setQuestionTextError('');
    const qt = questionEditorRef.current?.getInstance().getMarkdown() || '';
    const nt = noteEditorRef.current?.getInstance().getMarkdown() || '';
    if (!qt.trim() || qt.trim() === '<p><br></p>') {
      setQuestionTextError('Question text is required');
      setFormLoading(false);
      return;
    }
    const now = new Date().toISOString();
    const insertData: Question = {
      ...values,
      questionText: qt,
      noteText: nt,
      questionId: editId || nanoid(),
      quizId: quizId!,
      created_at: now,
      optionC: values.questionType === 1 ? values.optionC || '' : null,
      optionD: values.questionType === 1 ? values.optionD || '' : null,
      optionA: values.questionType === 2 ? 'True' : values.optionA,
      optionB: values.questionType === 2 ? 'False' : values.optionB,
      correctAnswer: values.correctAnswer.toLowerCase() as 'a' | 'b' | 'c' | 'd',
    };
    let error;
    if (editId) {
      const { error: updateError } = await supabase
        .from('questions')
        .update(insertData)
        .eq('questionId', editId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('questions')
        .insert([insertData]);
      error = insertError;
    }
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editId ? 'Question updated' : 'Question added');
      setOpen(false);
      setEditId(null);
      reset();
      setQuestionText('');
      setNoteText('');
      fetchQuestions();
    }
    setFormLoading(false);
  };

  // --- Edit Handler ---
  const handleEdit = (q: Question) => {
    setEditId(q.questionId);
    reset({
      questionType: q.questionType as 1 | 2,
      correctAnswer: q.correctAnswer,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC || '',
      optionD: q.optionD || '',
      previouslyAskedIn: q.previouslyAskedIn || '',
      languageCode: q.languageCode,
    });
    setTimeout(() => {
      if (questionEditorRef.current) questionEditorRef.current.getInstance().setMarkdown(q.questionText || '');
      if (noteEditorRef.current) noteEditorRef.current.getInstance().setMarkdown(q.noteText || '');
      setQuestionText(q.questionText || '');
      setNoteText(q.noteText || '');
    }, 0);
    setOpen(true);
  };

  // --- Add Handler ---
  const handleAdd = () => {
    setEditId(null);
    reset({
      questionType: 1,
      correctAnswer: undefined,
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      previouslyAskedIn: '',
      languageCode: 'en',
    });
    setTimeout(() => {
      if (questionEditorRef.current) questionEditorRef.current.getInstance().setMarkdown('');
      if (noteEditorRef.current) noteEditorRef.current.getInstance().setMarkdown('');
      setQuestionText('');
      setNoteText('');
    }, 0);
    setOpen(true);
  };

  // --- Delete handler ---
  const handleDelete = async () => {


    if (!deleteId) return;
    setDeleteLoading(true);
    const { error } = await supabase.from('questions').delete().eq('questionId', deleteId);
    if (error) {
      toast.error('Delete failed: ' + error.message);
    } else {
      toast.success('Question deleted');
      fetchQuestions();
    }
    setDeleteLoading(false);
    setDeleteId(null);
  };

  // --- Pagination ---
  const paginatedQuestions = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return questions.slice(start, start + ROWS_PER_PAGE);
  }, [questions, page]);

  const questionType = watch('questionType');

  return (
    <div className="relative w-full">
      <Toaster />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          Questions
          <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-blue-500 text-white text-sm font-semibold">{questions.length}</span>
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} className="px-6 py-2 font-semibold">+ Add Question</Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-lg lg:max-w-3xl xl:max-w-4xl' >
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Question' : 'Add Question'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-h-[80vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">Type</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    {...register('questionType', { valueAsNumber: true })}
                  >
                    {questionTypeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {errors.questionType && <p className="text-red-500 text-xs mt-1">{errors.questionType.message}</p>}
                </div>
                <div>
                  <label className="block mb-1 font-medium">Language</label>
                  <select className="w-full border rounded px-3 py-2" {...register('languageCode')}>
                    {languageOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {errors.languageCode && <p className="text-red-500 text-xs mt-1">{errors.languageCode.message}</p>}
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Question Text</label>
                <Editor
                  ref={questionEditorRef}
                  initialValue={questionText}
                  height="200px"
                  usageStatistics={false}
                  previewStyle="vertical"
                  initialEditType="wysiwyg"
                  className="my-editor"
                  onChange={() => setQuestionText(questionEditorRef.current?.getInstance().getMarkdown() || '')}
                />
                {(questionTextError) && <p className="text-red-500 text-xs mt-1">{questionTextError}</p>}
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="font-semibold mb-2">Options</div>
                <div className="flex flex-col space-y-3">
                  {['a', 'b', 'c', 'd'].map((opt, idx) => {
                    if (questionType === 2 && (opt === 'c' || opt === 'd')) return null;
                    const regKey = ({ a: 'optionA', b: 'optionB', c: 'optionC', d: 'optionD' } as const)[opt];
                    if (!regKey) return null;
                    return (
                      <div key={opt} className="flex items-center gap-2">
                        <input type="radio" value={opt} {...register('correctAnswer')} className="mt-0.5" />
                        <Input
                          {...register(regKey)}
                          disabled={questionType === 2 && (opt === 'a' ? false : opt === 'b' ? false : true)}
                          value={questionType === 2 ? (opt === 'a' ? 'True' : opt === 'b' ? 'False' : undefined) : undefined}
                          placeholder={questionType === 2 ? (opt === 'a' ? 'True' : opt === 'b' ? 'False' : '') : `Option ${opt.toUpperCase()}`}
                        />
                      </div>
                    );
                  })}
                  {errors.correctAnswer && <p className="text-red-500 text-xs mt-1">{errors.correctAnswer.message}</p>}
                  {errors.optionA && <p className="text-red-500 text-xs mt-1">{errors.optionA.message}</p>}
                  {errors.optionB && <p className="text-red-500 text-xs mt-1">{errors.optionB.message}</p>}
                  {questionType === 1 && errors.optionC && <p className="text-red-500 text-xs mt-1">{errors.optionC.message}</p>}
                  {questionType === 1 && errors.optionD && <p className="text-red-500 text-xs mt-1">{errors.optionD.message}</p>}
                </div>
              </div>
              <div className="border-t pt-4 mt-4">
                <div>
                  <label className="block mb-1 font-medium">Note (Markdown)</label>
                  <Editor
                    ref={noteEditorRef}
                    initialValue={noteText}
                    height="150px"
                    usageStatistics={false}
                    previewStyle="vertical"
                    initialEditType="wysiwyg"
                    onChange={() => setNoteText(noteEditorRef.current?.getInstance().getMarkdown() || '')}
                  />
                  {/* Note: noteText is not a field in the form, so no errors.noteText */}
                </div>
                <div>
                  <label className="block mb-1 font-medium">Previously Asked In</label>
                  <Input {...register('previouslyAskedIn')} placeholder="(optional)" />
                  {errors.previouslyAskedIn && <p className="text-red-500 text-xs mt-1">{errors.previouslyAskedIn.message}</p>}
                </div>
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
      <div className="overflow-x-auto rounded shadow border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Correct</TableHead>
              <TableHead>Option A</TableHead>
              <TableHead>Option B</TableHead>
              <TableHead>Option C</TableHead>
              <TableHead>Option D</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  <Loader2 className="mx-auto animate-spin w-6 h-6" />
                </TableCell>
              </TableRow>
            ) : paginatedQuestions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">No questions found.</TableCell>
              </TableRow>
            ) : (
              paginatedQuestions.map((q, idx) => (
                <React.Fragment key={q.questionId}>
                  <TableRow className="cursor-pointer hover:bg-blue-50" onClick={() => setExpandedRow(expandedRow === q.questionId ? null : q.questionId)}>
                    <TableCell className="max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">{(page - 1) * ROWS_PER_PAGE + idx + 1}</span>
                        <div className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                          <ReactMarkdown>{q.questionText}</ReactMarkdown>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${q.correctAnswer === 'a' ? 'bg-green-100 text-green-700' : q.correctAnswer === 'b' ? 'bg-blue-100 text-blue-700' : q.correctAnswer === 'c' ? 'bg-yellow-100 text-yellow-700' : 'bg-pink-100 text-pink-700'}`}>{q.correctAnswer}</span>
                    </TableCell>
                    <TableCell className="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">{q.optionA}</TableCell>
                    <TableCell className="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">{q.optionB}</TableCell>
                    <TableCell className="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">{q.optionC || '-'}</TableCell>
                    <TableCell className="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">{q.optionD || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); handleEdit(q); }}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={e => { e.stopPropagation(); setDeleteId(q.questionId); }}>
                          <Trash2 className="w-4 h-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedRow === q.questionId && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-gray-50">
                        <div className="mb-2">
                          <strong>Full Question:</strong>
                          <div className="prose max-w-none"><ReactMarkdown>{q.questionText}</ReactMarkdown></div>
                        </div>
                        {q.noteText && (
                          <div className="mb-2">
                            <strong>Note:</strong>
                            <div className="prose max-w-none"><ReactMarkdown>{q.noteText}</ReactMarkdown></div>
                          </div>
                        )}
                        {q.previouslyAskedIn && (
                          <div className="mb-2">
                            <strong>Previously Asked In:</strong> {q.previouslyAskedIn}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">Language: {q.languageCode}</div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination */}
      <div className="flex justify-end items-center gap-2 mt-4">
        <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
        <span>
          Page {page} of {Math.ceil(questions.length / ROWS_PER_PAGE)}
        </span>
        <Button variant="secondary" size="sm" onClick={() => setPage(p => (p * ROWS_PER_PAGE < questions.length ? p + 1 : p))} disabled={page * ROWS_PER_PAGE >= questions.length}>Next</Button>
      </div>
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
          </DialogHeader>
          <div className="mb-4 flex flex-col items-center text-center">
            <Trash2 className="w-12 h-12 text-red-500 mb-2" />
            <div className="text-lg font-semibold mb-2">Are you sure you want to delete this question?</div>
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
    </div>
  );
};

export default QuestionsPage; 
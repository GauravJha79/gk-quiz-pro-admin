import React, { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import ReactMarkdown from 'react-markdown';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from './components/ui/table';
import { Loader2, Trash2 } from 'lucide-react';
import QuestionDialog from './molecules/QuestionDialog';
import type { QuestionForm } from './molecules/QuestionDialog';
import { Button } from './components/ui/button';

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

const ROWS_PER_PAGE = 10;

interface QuestionsPageProps {
  internalQuizKey?: string;
}

const QuestionsPage: React.FC<QuestionsPageProps> = ({ internalQuizKey: propQuizKey }) => {
  const params = useParams<{ internalQuizKey: string }>();
  const quizId = propQuizKey || params.internalQuizKey;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [dialogInitialValues, setDialogInitialValues] = useState<Partial<QuestionForm>>({});

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

  // --- Add/Edit Question Dialog ---
  const handleAdd = () => {
    setDialogMode('add');
    setDialogInitialValues({});
    setEditId(null);
    setDialogOpen(true);
  };

  const handleEdit = (q: Question) => {
    setDialogMode('edit');
    setDialogInitialValues({
      questionType: q.questionType as 1 | 2, // Fix type error
      correctAnswer: q.correctAnswer,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC || '',
      optionD: q.optionD || '',
      previouslyAskedIn: q.previouslyAskedIn || '',
      languageCode: q.languageCode,
      questionText: q.questionText,
      noteText: q.noteText || '',
    });
    setEditId(q.questionId);
    setDialogOpen(true);
  };

  const handleDialogSubmit = async (values: QuestionForm) => {
    setFormLoading(true);
    let error;
    const now = new Date().toISOString();
    const insertData: Question = {
      ...values,
      questionId: dialogMode === 'edit' && editId ? editId : nanoid(),
      quizId: quizId!,
      created_at: now,
      optionC: values.questionType === 1 ? values.optionC || '' : null,
      optionD: values.questionType === 1 ? values.optionD || '' : null,
      optionA: values.questionType === 2 ? 'True' : values.optionA,
      optionB: values.questionType === 2 ? 'False' : values.optionB,
      correctAnswer: values.correctAnswer.toLowerCase() as 'a' | 'b' | 'c' | 'd',
    };
    if (dialogMode === 'edit' && editId) {
      const { error: updateError } = await supabase.from('questions').update(insertData).eq('questionId', editId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('questions').insert([insertData]);
      error = insertError;
    }
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(dialogMode === 'edit' ? 'Question updated' : 'Question added');
      setDialogOpen(false);
      setEditId(null);
      fetchQuestions();
    }
    setFormLoading(false);
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

  return (
    <div className="relative ">
      <Toaster />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          Questions
          <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-blue-500 text-white text-sm font-semibold">{questions.length}</span>
        </h2>
        <Button onClick={handleAdd} className="px-6 py-2 font-semibold">+ Add Question</Button>
        <QuestionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleDialogSubmit}
          loading={formLoading}
          initialValues={dialogInitialValues}
          mode={dialogMode}
        />
      </div>
      {/* Table */}
      <div className="w-full max-w-full overflow-x-auto rounded shadow border bg-white">
        <Table >
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Question ID</TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Correct Answer</TableHead>
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
                <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                  <Loader2 className="mx-auto animate-spin w-6 h-6" />
                </TableCell>
              </TableRow>
            ) : paginatedQuestions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-400">No questions found.</TableCell>
              </TableRow>
            ) : (
              paginatedQuestions.flatMap((row, idx) => [
                <TableRow key={row.questionId} className="cursor-pointer" onClick={() => setExpandedRow(expandedRow === row.questionId ? null : row.questionId)}>
                  <TableCell className="w-8 text-center">
                    <button
                      type="button"
                      aria-label={expandedRow === row.questionId ? 'Collapse' : 'Expand'}
                      className="focus:outline-none"
                      onClick={e => { e.stopPropagation(); setExpandedRow(expandedRow === row.questionId ? null : row.questionId); }}
                    >
                      <span className={`inline-block transition-transform ${expandedRow === row.questionId ? 'rotate-90' : ''}`}>▶</span>
                    </button>
                  </TableCell>
                  <TableCell>{(page - 1) * ROWS_PER_PAGE + idx + 1}</TableCell>
                  <TableCell>
                    <div className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                      <ReactMarkdown>{row.questionText || ''}</ReactMarkdown>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${row.correctAnswer === 'a' ? 'bg-green-100 text-green-700' : row.correctAnswer === 'b' ? 'bg-blue-100 text-blue-700' : row.correctAnswer === 'c' ? 'bg-yellow-100 text-yellow-700' : 'bg-pink-100 text-pink-700'}`}>
                      {row.correctAnswer}
                    </span>
                  </TableCell>
                  <TableCell>{row.optionA}</TableCell>
                  <TableCell>{row.optionB}</TableCell>
                  <TableCell>{row.optionC || '-'}</TableCell>
                  <TableCell>{row.optionD || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); handleEdit(row); }}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={e => { e.stopPropagation(); setDeleteId(row.questionId); }}>
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>,
                expandedRow === row.questionId && (
                  <TableRow key={row.questionId + '-expanded'}>
                    <TableCell colSpan={9} className="bg-gray-50">
                      <div className="mb-2">
                        <strong>Full Question:</strong>
                        <div className="prose max-w-none"><ReactMarkdown>{row.questionText || ''}</ReactMarkdown></div>
                      </div>
                      {row.noteText && (
                        <div className="mb-2">
                          <strong>Note:</strong>
                          <div className="prose max-w-none"><ReactMarkdown>{row.noteText}</ReactMarkdown></div>
                        </div>
                      )}
                      {row.previouslyAskedIn && (
                        <div className="mb-2">
                          <strong>Previously Asked In:</strong> {row.previouslyAskedIn}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">Language: {row.languageCode}</div>
                    </TableCell>
                  </TableRow>
                )
              ])
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
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
            <div className="flex flex-col items-center text-center">
              <Trash2 className="w-12 h-12 text-red-500 mb-2" />
              <div className="text-lg font-semibold mb-2">Are you sure you want to delete this question?</div>
              <div className="text-gray-500 mb-2">This action cannot be undone.</div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="secondary" onClick={() => setDeleteId(null)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionsPage; 
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from './components/ui/table';
import { Loader2, Pencil, CheckCircle2 } from 'lucide-react';
import QuestionDialog, { type QuestionForm } from './molecules/QuestionDialog';
import { Button } from './components/ui/button';

// --- Types ---
export type QuestionReport = {
  questionId: string;
  reason: string;
  additional_message?: string | null;
  playerId: string;
  status: string;
  created_at: string;
};

export type Question = {
  questionId: string;
  quizId: string;
  questionType: number;
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

const QuestionReportsPage: React.FC = () => {
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [page, setPage] = useState(1);
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInitialValues, setDialogInitialValues] = useState<Partial<QuestionForm>>({});

  // --- Fetch Reports ---
  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('question_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to fetch reports');
    } else {
      setReports((data as QuestionReport[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // --- Edit Question Modal ---
  const openEditModal = async (questionId: string) => {
    setEditLoading(true);
    setEditId(questionId);
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('questionId', questionId)
      .single();
    if (error || !data) {
      toast.error('Failed to fetch question');
      setEditLoading(false);
      return;
    }
    setDialogInitialValues({
      questionType: data.questionType,
      correctAnswer: data.correctAnswer,
      optionA: data.optionA,
      optionB: data.optionB,
      optionC: data.optionC || '',
      optionD: data.optionD || '',
      previouslyAskedIn: data.previouslyAskedIn || '',
      languageCode: data.languageCode,
      questionText: data.questionText,
      noteText: data.noteText || '',
    });
    setDialogOpen(true);
    setEditLoading(false);
  };
  const handleDialogSubmit = async (values: QuestionForm) => {
    if (!editId) return;
    setEditLoading(true);
    const { error } = await supabase.from('questions').update({ ...values }).eq('questionId', editId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Question updated');
      setDialogOpen(false);
      setEditId(null);
      fetchReports();
    }
    setEditLoading(false);
  };

  // --- Mark Resolved ---
  const handleMarkResolved = async (questionId: string) => {
    setResolveId(questionId);
    setResolveLoading(true);
    const { error } = await supabase
      .from('question_reports')
      .update({ status: 'resolved' })
      .eq('questionId', questionId);
    if (error) {
      toast.error('Failed to mark as resolved');
    } else {
      toast.success('Marked as resolved');
      fetchReports();
    }
    setResolveLoading(false);
    setResolveId(null);
  };

  // --- Pagination ---
  const paginatedReports = reports.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  return (
    <div className="relative w-full">
      <Toaster />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        Question Reports
        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-red-500 text-white text-sm font-semibold">{reports.length}</span>
      </h2>
      <div className="overflow-x-auto rounded shadow border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question ID</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Additional Message</TableHead>
              <TableHead>Player ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
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
            ) : paginatedReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">No reports found.</TableCell>
              </TableRow>
            ) : (
              paginatedReports.map((r) => (
                <TableRow key={r.questionId}>
                  <TableCell>{r.questionId}</TableCell>
                  <TableCell>{r.reason}</TableCell>
                  <TableCell>{r.additional_message || '-'}</TableCell>
                  <TableCell>{r.playerId}</TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${r.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                  </TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEditModal(r.questionId)}>
                        <Pencil className="w-4 h-4 mr-1" /> Edit Question
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={r.status === 'resolved' || resolveLoading}
                        onClick={() => handleMarkResolved(r.questionId)}
                      >
                        {resolveLoading && resolveId === r.questionId ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                        )}
                        Mark Resolved
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination */}
      <div className="flex justify-end items-center gap-2 mt-4">
        <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
        <span>
          Page {page} of {Math.ceil(reports.length / ROWS_PER_PAGE)}
        </span>
        <Button variant="secondary" size="sm" onClick={() => setPage(p => (p * ROWS_PER_PAGE < reports.length ? p + 1 : p))} disabled={page * ROWS_PER_PAGE >= reports.length}>Next</Button>
      </div>
      {/* Edit Question Modal */}
      <QuestionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleDialogSubmit}
        loading={editLoading}
        initialValues={dialogInitialValues}
        mode="edit"
      />
    </div>
  );
};

export default QuestionReportsPage; 
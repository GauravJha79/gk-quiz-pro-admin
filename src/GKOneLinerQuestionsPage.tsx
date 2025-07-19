import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
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
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import DeleteConfirmDialog from './atoms/DeleteConfirmDialog';
import { useParams, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

// Types
export type GKOneLinerQuestion = {
  id: string;
  question: string;
  topic_id: string;
  language_code: string;
  created_at: string;
};

// REMOVE: interface GKOneLinerQuestionsPageProps { topicId: string; languageCode: string; }

export default function GKOneLinerQuestionsPage() {
  // Get params from router
  const { topicId } = useParams();
  const query = new URLSearchParams(useLocation().search);
  const languageCode = query.get('language') || 'en';

  const [questions, setQuestions] = useState<GKOneLinerQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Editor refs
  const questionEditorRef = useRef<any>(null);
  const [questionText, setQuestionText] = useState('');
  const [questionTextError, setQuestionTextError] = useState('');

  // Fetch questions
  const fetchQuestions = async () => {
    if (!topicId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('gk_oneliner_questions')
      .select('*')
      .eq('topic_id', topicId)
      .eq('language_code', languageCode)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Failed to fetch questions');
    } else {
      setQuestions((data as GKOneLinerQuestion[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (topicId) {
      fetchQuestions();
    }
  }, [topicId, languageCode]);

  // Sync editor when dialog opens
  useEffect(() => {
    if (open) {
      if (editId) {
        // Editing: set editor to selected question
        const q = questions.find(q => q.id === editId);
        setQuestionText(q ? q.question : '');
        setTimeout(() => {
          if (questionEditorRef.current) questionEditorRef.current.getInstance().setMarkdown(q ? q.question : '');
        }, 0);
      } else {
        // Adding: clear editor
        setQuestionText('');
        setTimeout(() => {
          if (questionEditorRef.current) questionEditorRef.current.getInstance().setMarkdown('');
        }, 0);
      }
    }
  }, [open, editId, questions]);

  // Add or update question (manual validation)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setQuestionTextError('');
    const qt = questionEditorRef.current?.getInstance().getMarkdown() || '';
    const cleanQuestionText = qt.replace(/<[^>]*>/g, '').trim();
    if (!cleanQuestionText) {
      setQuestionTextError('Question is required');
      setFormLoading(false);
      return;
    }
    const insertData = {
      question: qt,
      topic_id: topicId,
      language_code: languageCode,
    };
    let error;
    if (editId) {
      const { error: updateError } = await supabase
        .from('gk_oneliner_questions')
        .update(insertData)
        .eq('id', editId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('gk_oneliner_questions')
        .insert([insertData]);
      error = insertError;
    }
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editId ? 'Question updated' : 'Question added');
      setOpen(false);
      setEditId(null);
      setQuestionText('');
      fetchQuestions();
    }
    setFormLoading(false);
  };

  // Handle edit
  const handleEdit = (question: GKOneLinerQuestion) => {
    setEditId(question.id);
    setOpen(true);
  };

  // Handle add
  const handleAdd = () => {
    setEditId(null);
    setOpen(true);
  };

  // Delete question
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    const { error } = await supabase
      .from('gk_oneliner_questions')
      .delete()
      .eq('id', deleteId);
    
    if (error) {
      toast.error('Delete failed: ' + error.message);
    } else {
      toast.success('Question deleted');
      fetchQuestions();
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

  const stripMarkdown = (markdown: string) => {
    return markdown.replace(/<[^>]*>/g, '').replace(/#{1,6}\s/g, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').trim();
  };

  return (
    <div className="space-y-6">
      <Toaster />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">GK One-Liner Questions</h2>
          <p className="text-muted-foreground">Manage one-liner questions for topic</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} className="px-6 py-2 font-semibold">
              <Plus className="w-4 h-4" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg lg:max-w-3xl xl:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Question' : 'Add Question'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="question" className="text-sm font-medium">
                  Question
                </label>
                <Editor
                  ref={questionEditorRef}
                  initialValue={questionText}
                  height="200px"
                  usageStatistics={false}
                  previewStyle="vertical"
                  initialEditType="wysiwyg"
                  onChange={() => setQuestionText(questionEditorRef.current?.getInstance().getMarkdown() || '')}
                />
                {questionTextError && (
                  <p className="text-red-500 text-xs mt-1">{questionTextError}</p>
                )}
              </div>
              <DialogFooter className="flex gap-2 pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={formLoading}>
                  {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editId ? 'Update' : 'Add'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Questions Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No questions found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-white">
          {questions.map((question) => (
            <div
              key={question.id}
              className="border rounded-lg p-6 space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Q. <ReactMarkdown>{question.question}</ReactMarkdown>
                  </h3>
                  <p className="text-gray-700">
                    {/* Removed answer display since answer field is deleted */}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  Created: {formatDate(question.created_at)}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(question)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteId(question.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Question"
        description="Are you sure you want to delete this question? This action cannot be undone."
      />
    </div>
  );
} 
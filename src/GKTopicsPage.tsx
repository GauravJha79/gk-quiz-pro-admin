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

// Types
export type GKTopic = {
  id: string;
  title: string;
  subject_id: string;
  language_code: string;
  created_at: string;
};

const topicSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

type TopicForm = z.infer<typeof topicSchema>;

interface GKTopicsPageProps {
  subjectId: string;
  languageCode: string;
}

export default function GKTopicsPage({ subjectId, languageCode }: GKTopicsPageProps) {
  const [topics, setTopics] = useState<GKTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TopicForm>({
    resolver: zodResolver(topicSchema),
  });

  // Fetch topics
  const fetchTopics = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gk_topics')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('language_code', languageCode)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Failed to fetch topics');
    } else {
      setTopics((data as GKTopic[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (subjectId) {
      fetchTopics();
    }
  }, [subjectId, languageCode]);

  // Add or update topic
  const onSubmit = async (values: TopicForm) => {
    setFormLoading(true);
    const insertData = {
      ...values,
      subject_id: subjectId,
      language_code: languageCode,
    };

    let error;
    if (editId) {
      // Update
      const { error: updateError } = await supabase
        .from('gk_topics')
        .update(insertData)
        .eq('id', editId);
      error = updateError;
    } else {
      // Insert
      const { error: insertError } = await supabase
        .from('gk_topics')
        .insert([insertData]);
      error = insertError;
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editId ? 'Topic updated' : 'Topic added');
      setOpen(false);
      setEditId(null);
      reset();
      fetchTopics();
    }
    setFormLoading(false);
  };

  // Handle edit
  const handleEdit = (topic: GKTopic) => {
    setEditId(topic.id);
    setValue('title', topic.title);
    setOpen(true);
  };

  // Handle add
  const handleAdd = () => {
    setEditId(null);
    reset();
    setOpen(true);
  };

  // Delete topic
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    const { error } = await supabase
      .from('gk_topics')
      .delete()
      .eq('id', deleteId);
    
    if (error) {
      toast.error('Delete failed: ' + error.message);
    } else {
      toast.success('Topic deleted');
      fetchTopics();
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

  return (
    <div className="space-y-6">
      <Toaster />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">GK Topics</h2>
          <p className="text-muted-foreground">Manage topics for subject</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} className="px-6 py-2 font-semibold">
              <Plus className="w-4 h-4" />
              Add Topic
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Topic' : 'Add Topic'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Title
                </label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Enter topic title"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>
              <DialogFooter>
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

      {/* Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : topics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  No topics found
                </TableCell>
              </TableRow>
            ) : (
              topics.map((topic) => (
                <TableRow
                  key={topic.id}
                  className="cursor-pointer hover:bg-blue-50 transition"
                  onClick={() => navigate(`/gk-oneliner-questions/${topic.id}?language=${topic.language_code}`)}
                >
                  <TableCell className="font-medium">{topic.title}</TableCell>
                  <TableCell>{formatDate(topic.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => { e.stopPropagation(); handleEdit(topic); }}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => { e.stopPropagation(); setDeleteId(topic.id); }}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => { e.stopPropagation(); navigate(`/gk-oneliner-questions/${topic.id}?language=${topic.language_code}`); }}
                        title="View One-Liner Questions"
                      >
                        <ArrowRight className="w-4 h-4" />
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
        title="Delete Topic"
        description="Are you sure you want to delete this topic? This action cannot be undone."
      />
    </div>
  );
} 
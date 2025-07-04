import React, { useRef, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Editor } from '@toast-ui/react-editor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export const questionSchema = z.object({
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
  questionText: z.string().min(1, 'Question text is required'),
  noteText: z.string().optional().or(z.literal('')).nullable(),
});
export type QuestionForm = z.infer<typeof questionSchema>;

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Hindi', value: 'hi' },
];
const questionTypeOptions = [
  { label: 'Multiple Choice', value: 1 },
  { label: 'True/False', value: 2 },
];

type QuestionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: QuestionForm) => Promise<void>;
  loading?: boolean;
  initialValues?: Partial<QuestionForm>;
  mode?: 'add' | 'edit';
};

const QuestionDialog: React.FC<QuestionDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  initialValues = {},
  mode = 'add',
}) => {
  const questionEditorRef = useRef<any>(null);
  const noteEditorRef = useRef<any>(null);
  const [questionText, setQuestionText] = useState(initialValues.questionText || '');
  const [noteText, setNoteText] = useState(initialValues.noteText || '');
  const [questionTextError, setQuestionTextError] = useState('');

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
      ...initialValues,
    },
  });

  // Sync editors with initial values on open
  useEffect(() => {
    if (open) {
      setQuestionText(initialValues.questionText || '');
      setNoteText(initialValues.noteText || '');
      reset({
        questionType: initialValues.questionType ?? 1,
        correctAnswer: initialValues.correctAnswer,
        optionA: initialValues.optionA ?? '',
        optionB: initialValues.optionB ?? '',
        optionC: initialValues.optionC ?? '',
        optionD: initialValues.optionD ?? '',
        previouslyAskedIn: initialValues.previouslyAskedIn ?? '',
        languageCode: initialValues.languageCode ?? 'en',
        questionText: initialValues.questionText ?? '',
        noteText: initialValues.noteText ?? '',
      });
      setTimeout(() => {
        if (questionEditorRef.current) questionEditorRef.current.getInstance().setMarkdown(initialValues.questionText || '');
        if (noteEditorRef.current) noteEditorRef.current.getInstance().setMarkdown(initialValues.noteText || '');
      }, 0);
    }
    // eslint-disable-next-line
  }, [open]);

  const questionType = watch('questionType');

  const handleFormSubmit = async (values: QuestionForm) => {
    setQuestionTextError('');
    const qt = questionEditorRef.current?.getInstance().getMarkdown() || '';
    const nt = noteEditorRef.current?.getInstance().getMarkdown() || '';
    if (!qt.trim() || qt.trim() === '<p><br></p>') {
      setQuestionTextError('Question text is required');
      return;
    }
    await onSubmit({ ...values, questionText: qt, noteText: nt });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg lg:max-w-3xl xl:max-w-4xl'>
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Question' : 'Add Question'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 max-h-[80vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-medium">Type</label>
              <select
                className="w-full border rounded px-3 py-2"
                {...register('questionType', { valueAsNumber: true })}
                disabled={loading}
              >
                {questionTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.questionType && <p className="text-red-500 text-xs mt-1">{errors.questionType.message}</p>}
            </div>
            <div>
              <label className="block mb-1 font-medium">Language</label>
              <select className="w-full border rounded px-3 py-2" {...register('languageCode')} disabled={loading}>
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
                    <input type="radio" value={opt} {...register('correctAnswer')} className="mt-0.5" disabled={loading} />
                    <Input
                      {...register(regKey)}
                      disabled={questionType === 2 && (opt === 'a' ? false : opt === 'b' ? false : true) || loading}
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
            </div>
            <div>
              <label className="block mb-1 font-medium">Previously Asked In</label>
              <Input {...register('previouslyAskedIn')} placeholder="(optional)" disabled={loading} />
              {errors.previouslyAskedIn && <p className="text-red-500 text-xs mt-1">{errors.previouslyAskedIn.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? (mode === 'edit' ? 'Updating...' : 'Adding...') : (mode === 'edit' ? 'Update' : 'Add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionDialog; 
import React, { useRef, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Editor } from '@toast-ui/react-editor';
import toast from 'react-hot-toast';
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
}).refine((data) => {
  // For MCQ questions, ensure options C and D are filled if they exist
  if (data.questionType === 1) {
    if (data.correctAnswer === 'c' && (!data.optionC || data.optionC.trim() === '')) {
      return false;
    }
    if (data.correctAnswer === 'd' && (!data.optionD || data.optionD.trim() === '')) {
      return false;
    }
  }
  return true;
}, {
  message: "The selected correct answer option must have text",
  path: ["correctAnswer"]
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
      questionText: '', // Set empty string as default
      noteText: '', // Set empty string as default
    },
  });
  
  console.log('Form errors:', errors); // Debug log
  console.log('Form state:', { errors, isDirty: false, isValid: false }); // Debug log

  // Sync editors with initial values on open
  useEffect(() => {
    console.log('Dialog open state changed:', open); // Debug log
    console.log('Dialog mode:', mode); // Debug log
    console.log('Initial values:', initialValues); // Debug log
    
    if (open) {
      setQuestionText(initialValues.questionText || '');
      setNoteText(initialValues.noteText || '');
      reset({
        questionType: initialValues.questionType ?? 1,
        correctAnswer: mode === 'edit' ? initialValues.correctAnswer : undefined,
        optionA: initialValues.optionA ?? '',
        optionB: initialValues.optionB ?? '',
        optionC: initialValues.optionC ?? '',
        optionD: initialValues.optionD ?? '',
        previouslyAskedIn: initialValues.previouslyAskedIn ?? '',
        languageCode: initialValues.languageCode ?? 'en',
        questionText: initialValues.questionText ?? '', // Set from initial values or empty string
        noteText: initialValues.noteText ?? '', // Set from initial values or empty string
      });
      setTimeout(() => {
        if (questionEditorRef.current) questionEditorRef.current.getInstance().setMarkdown(initialValues.questionText || '');
        if (noteEditorRef.current) noteEditorRef.current.getInstance().setMarkdown(initialValues.noteText || '');
      }, 0);
    }
    // eslint-disable-next-line
  }, [open, mode]);

  const questionType = watch('questionType');

  const handleFormSubmit = async (values: QuestionForm) => {
    console.log('Form submission started'); // Debug log
    console.log('Form values:', values); // Debug log
    
    setQuestionTextError('');
    
    // Clean the question text (remove HTML tags and check for actual content)
    const cleanQuestionText = values.questionText?.replace(/<[^>]*>/g, '').trim() || '';
    console.log('Clean question text:', cleanQuestionText); // Debug log
    
    // Validate question text
    if (!cleanQuestionText || cleanQuestionText === '') {
      console.log('Question text validation failed - empty after cleaning'); // Debug log
      setQuestionTextError('Question text is required');
      return;
    }
    
    // Validate correct answer is selected
    if (!values.correctAnswer) {
      console.log('Correct answer validation failed'); // Debug log
      toast.error('Please select the correct answer');
      return;
    }
    
    console.log('All validations passed, calling onSubmit'); // Debug log
    
    try {
      await onSubmit(values);
      console.log('onSubmit completed successfully'); // Debug log
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Failed to save question. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg lg:max-w-3xl xl:max-w-4xl'>
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Question' : 'Add Question'}</DialogTitle>
        </DialogHeader>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            console.log('Form onSubmit triggered'); // Debug log
            
            // Get editor content first
            const qt = questionEditorRef.current?.getInstance().getMarkdown() || '';
            const nt = noteEditorRef.current?.getInstance().getMarkdown() || '';
            
            console.log('Editor content - Question:', qt); // Debug log
            console.log('Editor content - Note:', nt); // Debug log
            
            // Update form values with editor content
            setValue('questionText', qt);
            setValue('noteText', nt);
            
            // Now trigger form validation and submission
            handleSubmit(handleFormSubmit)(e);
          }} 
          className="space-y-5 max-h-[80vh] overflow-y-auto pr-2"
        >
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
            <div className="font-semibold mb-2">Options <span className="text-red-500">*</span></div>
            <div className="text-sm text-gray-600 mb-3">Select the correct answer by clicking the radio button next to the option</div>
            <div className="flex flex-col space-y-3">
              {['a', 'b', 'c', 'd'].map((opt, idx) => {
                if (questionType === 2 && (opt === 'c' || opt === 'd')) return null;
                const regKey = ({ a: 'optionA', b: 'optionB', c: 'optionC', d: 'optionD' } as const)[opt];
                if (!regKey) return null;
                return (
                  <div key={opt} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <input 
                      type="radio" 
                      value={opt} 
                      {...register('correctAnswer')} 
                      className="w-6 h-6 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2 cursor-pointer" 
                      disabled={loading} 
                      id={`correct-${opt}`}
                    />
                    <label htmlFor={`correct-${opt}`} className="flex-1 cursor-pointer">
                      <Input
                        {...register(regKey)}
                        disabled={questionType === 2 && (opt === 'a' ? false : opt === 'b' ? false : true) || loading}
                        value={questionType === 2 ? (opt === 'a' ? 'True' : opt === 'b' ? 'False' : undefined) : undefined}
                        placeholder={questionType === 2 ? (opt === 'a' ? 'True' : opt === 'b' ? 'False' : '') : `Option ${opt.toUpperCase()}`}
                        className="cursor-pointer"
                      />
                    </label>
                  </div>
                );
              })}
              {errors.correctAnswer && <p className="text-red-500 text-sm mt-2 font-medium">{errors.correctAnswer.message}</p>}
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
            <Button 
              type="submit" 
              disabled={loading}
              onClick={() => console.log('Submit button clicked')} // Debug log
            >
              {loading ? (mode === 'edit' ? 'Updating...' : 'Adding...') : (mode === 'edit' ? 'Update' : 'Add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionDialog; 
import React from 'react';

interface QuizDeleteAlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    questionVolume: number;
    title: string;
  } | null;
}

export default function QuizDeleteAlertDialog({ isOpen, onClose, data }: QuizDeleteAlertDialogProps) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-fade-in">
        {/* Header with icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>
        
        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
          Cannot Delete Quiz
        </h2>
        
        {/* Subtitle */}
        <p className="text-center text-gray-600 mb-6">
          <span className="font-semibold text-blue-600">"{data.title}"</span> contains questions
        </p>
        
        {/* Question count */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border border-green-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">❓</span>
              </div>
              <span className="font-medium text-gray-700">Questions</span>
            </div>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold text-sm">
              {data.questionVolume}
            </span>
          </div>
        </div>
        
        {/* Message */}
        <p className="text-center text-gray-600 mb-6 leading-relaxed">
          Please delete all questions first before deleting this quiz. 
          This ensures data integrity and prevents orphaned content.
        </p>
        
        {/* Action button */}
        <div className="flex justify-center">
          <button
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            onClick={onClose}
          >
            Got it, thanks!
          </button>
        </div>
      </div>
      <style>{`
        .animate-fade-in { animation: fadeIn 0.5s cubic-bezier(.4,0,.2,1) both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
} 
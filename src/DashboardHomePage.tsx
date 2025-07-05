import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { 
  BookOpen, 
  FolderOpen, 
  Layers, 
  FileText, 
  HelpCircle, 
  Users, 
  Flag, 
  Trophy,
  Loader2
} from 'lucide-react';

interface DashboardStats {
  examBooks: number;
  sections: number;
  categories: number;
  quizzes: number;
  questions: number;
  users: number;
  reports: number;
  leaderboard: number;
}

interface DashboardCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  onClick?: () => void;
  gradient: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ 
  icon, 
  title, 
  value, 
  description, 
  onClick,
  gradient 
}) => {
  return (
    <div 
      className={`relative overflow-hidden rounded-xl p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl ${gradient}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              {icon}
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{value}</p>
          <p className="text-white/80 text-sm">{description}</p>
        </div>
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
    </div>
  );
};

const DashboardHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    examBooks: 0,
    sections: 0,
    categories: 0,
    quizzes: 0,
    questions: 0,
    users: 0,
    reports: 0,
    leaderboard: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          examBooksResult,
          sectionsResult,
          categoriesResult,
          quizzesResult,
          questionsResult,
          usersResult,
          reportsResult,
          leaderboardResult
        ] = await Promise.all([
          supabase.from('exam_book').select('*', { count: 'exact', head: true }),
          supabase.from('quiz_sections').select('*', { count: 'exact', head: true }),
          supabase.from('quiz_categories').select('*', { count: 'exact', head: true }),
          supabase.from('quizzes').select('*', { count: 'exact', head: true }),
          supabase.from('questions').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('question_reports').select('*', { count: 'exact', head: true }),
          supabase.from('user_progress').select('*', { count: 'exact', head: true })
        ]);

        setStats({
          examBooks: examBooksResult.count || 0,
          sections: sectionsResult.count || 0,
          categories: categoriesResult.count || 0,
          quizzes: quizzesResult.count || 0,
          questions: questionsResult.count || 0,
          users: usersResult.count || 0,
          reports: reportsResult.count || 0,
          leaderboard: leaderboardResult.count || 0
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const cardData = [
    {
      icon: <BookOpen className="w-6 h-6 text-white" />,
      title: "Total Books",
      value: formatNumber(stats.examBooks),
      description: "Manage Exam Books",
      onClick: () => navigate('/exam-books'),
      gradient: "bg-gradient-to-br from-blue-500 to-blue-600"
    },
    {
      icon: <FolderOpen className="w-6 h-6 text-white" />,
      title: "Total Sections",
      value: formatNumber(stats.sections),
      description: "Manage Quiz Sections",
      onClick: () => navigate('/exam-books'),
      gradient: "bg-gradient-to-br from-green-500 to-green-600"
    },
    {
      icon: <Layers className="w-6 h-6 text-white" />,
      title: "Total Categories",
      value: formatNumber(stats.categories),
      description: "Manage Quiz Categories",
      onClick: () => navigate('/exam-books'),
      gradient: "bg-gradient-to-br from-purple-500 to-purple-600"
    },
    {
      icon: <FileText className="w-6 h-6 text-white" />,
      title: "Total Quizzes",
      value: formatNumber(stats.quizzes),
      description: "Manage Quizzes",
      onClick: () => navigate('/exam-books'),
      gradient: "bg-gradient-to-br from-orange-500 to-orange-600"
    },
    {
      icon: <HelpCircle className="w-6 h-6 text-white" />,
      title: "Total Questions",
      value: formatNumber(stats.questions),
      description: "Manage Questions",
      onClick: () => navigate('/exam-books'),
      gradient: "bg-gradient-to-br from-red-500 to-red-600"
    },
    {
      icon: <Users className="w-6 h-6 text-white" />,
      title: "Total Users",
      value: formatNumber(stats.users),
      description: "Manage Users",
      onClick: () => navigate('/users'),
      gradient: "bg-gradient-to-br from-indigo-500 to-indigo-600"
    },
    {
      icon: <Flag className="w-6 h-6 text-white" />,
      title: "Total Reports",
      value: formatNumber(stats.reports),
      description: "View Question Reports",
      onClick: () => navigate('/question-reports'),
      gradient: "bg-gradient-to-br from-pink-500 to-pink-600"
    },
    {
      icon: <Trophy className="w-6 h-6 text-white" />,
      title: "Leaderboard",
      value: formatNumber(stats.leaderboard),
      description: "View User Progress",
      onClick: () => navigate('/users'),
      gradient: "bg-gradient-to-br from-yellow-500 to-yellow-600"
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome, Admin 👋
        </h1>
        <p className="text-gray-600">
          Here's an overview of your quiz application data
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cardData.map((card, index) => (
          <DashboardCard
            key={index}
            icon={card.icon}
            title={card.title}
            value={card.value}
            description={card.description}
            onClick={card.onClick}
            gradient={card.gradient}
          />
        ))}
      </div>

      {/* Quick Actions Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/exam-books')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-left"
          >
            <BookOpen className="w-6 h-6 text-blue-500 mb-2" />
            <h3 className="font-semibold text-gray-900">Add New Book</h3>
            <p className="text-sm text-gray-600">Create a new exam book</p>
          </button>
          
          <button
            onClick={() => navigate('/users')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-left"
          >
            <Users className="w-6 h-6 text-green-500 mb-2" />
            <h3 className="font-semibold text-gray-900">Manage Users</h3>
            <p className="text-sm text-gray-600">View and manage user accounts</p>
          </button>
          
          <button
            onClick={() => navigate('/question-reports')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-left"
          >
            <Flag className="w-6 h-6 text-red-500 mb-2" />
            <h3 className="font-semibold text-gray-900">Review Reports</h3>
            <p className="text-sm text-gray-600">Handle question reports</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHomePage; 
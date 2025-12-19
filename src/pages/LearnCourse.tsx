import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import VideoPlayer from '@/components/learn/VideoPlayer';
import LessonSidebar from '@/components/learn/LessonSidebar';
import LessonContent from '@/components/learn/LessonContent';
import QuizComponent from '@/components/learn/QuizComponent';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';

interface Chapter {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons: Lesson[];
  quiz?: Quiz | null;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  notes_content: string | null;
  colab_notebook_url: string | null;
  order_index: number;
  completed: boolean;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
}

const LearnCourse = () => {
  const { courseSlug } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<any>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingContent, setLoadingContent] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchCourseContent = async () => {
      if (!user || !courseSlug) return;

      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', courseSlug)
        .single();

      if (courseError || !courseData) {
        console.error('Course not found');
        navigate('/dashboard');
        return;
      }

      setCourse(courseData);

      // Verify enrollment
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseData.id)
        .eq('payment_status', 'completed')
        .single();

      if (!enrollment) {
        navigate('/dashboard');
        return;
      }

      // Fetch chapters with lessons
      const { data: chaptersData } = await supabase
        .from('course_chapters')
        .select('*')
        .eq('course_id', courseData.id)
        .order('order_index');

      if (!chaptersData) return;

      // Fetch lessons and progress for each chapter
      const chaptersWithLessons = await Promise.all(
        chaptersData.map(async (chapter) => {
          const { data: lessons } = await supabase
            .from('lessons')
            .select('*')
            .eq('chapter_id', chapter.id)
            .order('order_index');

          // Fetch progress for each lesson
          const lessonsWithProgress = await Promise.all(
            (lessons || []).map(async (lesson) => {
              const { data: progress } = await supabase
                .from('lesson_progress')
                .select('completed')
                .eq('user_id', user.id)
                .eq('lesson_id', lesson.id)
                .single();

              return {
                ...lesson,
                completed: progress?.completed || false,
              };
            })
          );

          // Fetch quiz for chapter
          const { data: quiz } = await supabase
            .from('quizzes')
            .select('*')
            .eq('chapter_id', chapter.id)
            .single();

          return {
            ...chapter,
            lessons: lessonsWithProgress,
            quiz,
          };
        })
      );

      setChapters(chaptersWithLessons);
      
      // Set first lesson as current
      if (chaptersWithLessons.length > 0 && chaptersWithLessons[0].lessons.length > 0) {
        setCurrentLesson(chaptersWithLessons[0].lessons[0]);
      }
      
      setLoadingContent(false);
    };

    fetchCourseContent();
  }, [user, courseSlug, navigate]);

  const handleLessonSelect = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setShowQuiz(false);
    setCurrentQuiz(null);
  };

  const handleQuizSelect = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
    setShowQuiz(true);
    setCurrentLesson(null);
  };

  const handleLessonComplete = async () => {
    if (!currentLesson || !user) return;

    await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: currentLesson.id,
        completed: true,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,lesson_id',
      });

    // Update local state
    setChapters(prev => prev.map(chapter => ({
      ...chapter,
      lessons: chapter.lessons.map(lesson => 
        lesson.id === currentLesson.id ? { ...lesson, completed: true } : lesson
      ),
    })));

    // Navigate to next lesson
    navigateLesson('next');
  };

  const navigateLesson = (direction: 'prev' | 'next') => {
    const allLessons = chapters.flatMap(c => c.lessons);
    const currentIndex = allLessons.findIndex(l => l.id === currentLesson?.id);
    
    if (direction === 'next' && currentIndex < allLessons.length - 1) {
      setCurrentLesson(allLessons[currentIndex + 1]);
      setShowQuiz(false);
    } else if (direction === 'prev' && currentIndex > 0) {
      setCurrentLesson(allLessons[currentIndex - 1]);
      setShowQuiz(false);
    }
  };

  const getAllLessons = () => chapters.flatMap(c => c.lessons);
  const currentLessonIndex = getAllLessons().findIndex(l => l.id === currentLesson?.id);

  if (loading || loadingContent) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar Toggle for Mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed bottom-4 left-4 z-50 lg:hidden shadow-lg bg-card"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X /> : <Menu />}
        </Button>

        {/* Sidebar */}
        <div className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed lg:relative lg:translate-x-0
          w-80 h-full bg-card border-r border-border/50
          transition-transform z-40
          overflow-y-auto
        `}>
          <LessonSidebar
            courseTitle={course?.title || ''}
            chapters={chapters}
            currentLessonId={currentLesson?.id}
            onLessonSelect={handleLessonSelect}
            onQuizSelect={handleQuizSelect}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {showQuiz && currentQuiz ? (
            <QuizComponent
              quizId={currentQuiz.id}
              title={currentQuiz.title}
              passingScore={currentQuiz.passing_score}
              onComplete={() => setShowQuiz(false)}
            />
          ) : currentLesson ? (
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              {/* Video Player */}
              {currentLesson.video_url && (
                <VideoPlayer
                  videoUrl={currentLesson.video_url}
                  lessonId={currentLesson.id}
                />
              )}

              {/* Lesson Content */}
              <LessonContent
                title={currentLesson.title}
                description={currentLesson.description}
                notesContent={currentLesson.notes_content}
                colabUrl={currentLesson.colab_notebook_url}
              />

              {/* Navigation */}
              <div className="flex justify-between items-center pt-6 border-t border-border/50">
                <Button
                  variant="outline"
                  onClick={() => navigateLesson('prev')}
                  disabled={currentLessonIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                {!currentLesson.completed && (
                  <Button onClick={handleLessonComplete} className="gradient-primary">
                    Mark Complete
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => navigateLesson('next')}
                  disabled={currentLessonIndex === getAllLessons().length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a lesson to get started
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearnCourse;

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import VideoPlayer from '@/components/learn/VideoPlayer';
import LessonSidebar from '@/components/learn/LessonSidebar';
import LessonContent from '@/components/learn/LessonContent';
import QuizComponent from '@/components/learn/QuizComponent';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { Chapter as CourseChapter, Course, Lesson as CourseLesson, fetchCourseAccess } from '@/api/courses';
import { fetchLearningContent, markLessonComplete, Quiz as CourseQuiz } from '@/api/classwork';

type LessonWithProgress = CourseLesson & { completed: boolean };
type ChapterWithQuiz = CourseChapter & { lessons: LessonWithProgress[]; quiz?: CourseQuiz | null };

const LearnCourse = () => {
  const { courseSlug } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<ChapterWithQuiz[]>([]);
  const [currentLesson, setCurrentLesson] = useState<LessonWithProgress | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<CourseQuiz | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingContent, setLoadingContent] = useState(true);
  const [allowedLessonIds, setAllowedLessonIds] = useState<string[]>([]);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchCourseContent = async () => {
      if (!user || !courseSlug) return;

      try {
        const content = await fetchLearningContent(courseSlug);

        const access = await fetchCourseAccess(content.course.id);

        if (!access.enrolled && access.allowedLessonIds.length === 0) {
          setLoadingContent(false);
          navigate('/dashboard');
          return;
        }

        const chaptersWithQuiz = (content.chapters || [])
          .map((chapter: CourseChapter) => {
            const lessonsWithProgress = chapter.lessons
              .map((lesson: CourseLesson) => ({
                ...lesson,
                completed: lesson.completed ?? false,
              })) as LessonWithProgress[];

            const accessibleLessons = lessonsWithProgress.filter(
              lesson => access.enrolled || access.allowedLessonIds.includes(lesson.id)
            );

            return {
              ...chapter,
              lessons: accessibleLessons,
              quiz: chapter.quizId
                ? {
                    id: chapter.quizId,
                    title: chapter.quizTitle || 'Chapter Quiz',
                    passingScore: chapter.passingScore ?? 70,
                  }
                : null,
            };
          })
          .filter(chapter => chapter.lessons.length > 0 || chapter.quiz) as ChapterWithQuiz[];

        setCourse(content.course);
        setAllowedLessonIds(access.allowedLessonIds);
        setEnrolled(access.enrolled);
        setChapters(chaptersWithQuiz);
        
        if (chaptersWithQuiz.length > 0 && chaptersWithQuiz[0].lessons.length > 0) {
          setCurrentLesson(chaptersWithQuiz[0].lessons[0]);
        }
        
        setLoadingContent(false);
      } catch (error) {
        console.error('Error loading course content', error);
        navigate('/dashboard');
        setLoadingContent(false);
      }
    };

    fetchCourseContent();
  }, [user, courseSlug, navigate]);

  const handleLessonSelect = (lesson: LessonWithProgress) => {
    setCurrentLesson(lesson);
    setShowQuiz(false);
    setCurrentQuiz(null);
  };

  const handleQuizSelect = (quiz: CourseQuiz) => {
    setCurrentQuiz(quiz);
    setShowQuiz(true);
    setCurrentLesson(null);
  };

  const handleLessonComplete = async () => {
    if (!currentLesson || !user) return;

    await markLessonComplete(currentLesson.id);

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
  const canAccessCurrentLesson = currentLesson ? (enrolled || allowedLessonIds.includes(currentLesson.id)) : false;

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
              passingScore={currentQuiz.passingScore}
              onComplete={() => setShowQuiz(false)}
            />
          ) : currentLesson ? (
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              {/* Video Player */}
              {currentLesson.videoUrl && (
                <VideoPlayer
                  videoUrl={currentLesson.videoUrl || ''}
                  lessonId={currentLesson.id}
                  canAccess={canAccessCurrentLesson}
                />
              )}

              {/* Lesson Content */}
              <LessonContent
                title={currentLesson.title}
                description={currentLesson.description}
                notesContent={currentLesson.notesContent}
                colabUrl={currentLesson.colabNotebookUrl}
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
                  <Button onClick={handleLessonComplete} className="gradient-primary" disabled={!enrolled}>
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

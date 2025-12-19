import { CheckCircle, Circle, FileText, Play, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Lesson {
  id: string;
  title: string;
  completed: boolean;
}

interface Quiz {
  id: string;
  title: string;
}

interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
  quiz?: Quiz | null;
}

interface LessonSidebarProps {
  courseTitle: string;
  chapters: Chapter[];
  currentLessonId?: string;
  onLessonSelect: (lesson: Lesson) => void;
  onQuizSelect: (quiz: Quiz) => void;
}

const LessonSidebar = ({
  courseTitle,
  chapters,
  currentLessonId,
  onLessonSelect,
  onQuizSelect,
}: LessonSidebarProps) => {
  const totalLessons = chapters.reduce((acc, c) => acc + c.lessons.length, 0);
  const completedLessons = chapters.reduce(
    (acc, c) => acc + c.lessons.filter(l => l.completed).length,
    0
  );
  const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Course Header */}
      <div className="p-4 border-b border-border/50">
        <h2 className="font-display font-bold text-lg line-clamp-2">{courseTitle}</h2>
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completedLessons} / {totalLessons}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </div>

      {/* Chapters List */}
      <div className="flex-1 overflow-y-auto">
        <Accordion type="multiple" defaultValue={chapters.map(c => c.id)} className="p-2">
          {chapters.map((chapter, chapterIndex) => {
            const chapterCompleted = chapter.lessons.every(l => l.completed);
            const chapterProgress = chapter.lessons.length > 0
              ? chapter.lessons.filter(l => l.completed).length / chapter.lessons.length * 100
              : 0;

            return (
              <AccordionItem key={chapter.id} value={chapter.id} className="border-none">
                <AccordionTrigger className="hover:no-underline py-3 px-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3 text-left">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      chapterCompleted 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {chapterCompleted ? <CheckCircle className="h-4 w-4" /> : chapterIndex + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{chapter.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {chapter.lessons.length} lessons
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-4">
                  <div className="space-y-1 py-2">
                    {chapter.lessons.map((lesson, lessonIndex) => (
                      <button
                        key={lesson.id}
                        onClick={() => onLessonSelect(lesson)}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all",
                          currentLessonId === lesson.id
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted/50"
                        )}
                      >
                        {lesson.completed ? (
                          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                        ) : currentLessonId === lesson.id ? (
                          <Play className="h-4 w-4 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-sm truncate">{lesson.title}</span>
                      </button>
                    ))}
                    
                    {/* Chapter Quiz */}
                    {chapter.quiz && (
                      <button
                        onClick={() => onQuizSelect(chapter.quiz!)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all hover:bg-muted/50"
                      >
                        <HelpCircle className="h-4 w-4 text-accent shrink-0" />
                        <span className="text-sm">{chapter.quiz.title}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Quiz
                        </Badge>
                      </button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
};

export default LessonSidebar;

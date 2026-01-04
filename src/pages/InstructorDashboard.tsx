import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ClipboardList, FileUp, Layers3, LayoutDashboard, Sparkles } from 'lucide-react';
import { listInstructorCourses } from '@/api/instructor';
import { Course } from '@/api/courses';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const quickLinks = [
  { icon: Layers3, title: 'Course Editor', description: 'Manage pricing and visibility', to: '/instructor/courses' },
  { icon: ClipboardList, title: 'Lessons', description: 'Organize videos and notes', to: '/instructor/lessons' },
  { icon: BookOpen, title: 'Classwork', description: 'Attach projects & quizzes', to: '/instructor/classwork' },
  { icon: FileUp, title: 'Uploads', description: 'Manage lesson assets', to: '/instructor/uploads' },
];

export default function InstructorDashboard() {
  const { loading, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const data = await listInstructorCourses();
        setCourses(data);
      } catch (error) {
        toast({
          title: 'Unable to load courses',
          description: error instanceof Error ? error.message : 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoadingCourses(false);
      }
    };

    loadCourses();
  }, []);

  const publishedCount = useMemo(() => courses.filter((c) => c.isPublished).length, [courses]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-10 space-y-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary">
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Instructor Workspace</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-display font-bold">Welcome back, {user?.full_name || 'Instructor'}!</h1>
              <p className="text-muted-foreground mt-1">Track course health and jump into editing tools.</p>
            </div>
            <Button asChild className="gradient-primary">
              <Link to="/instructor/uploads">Upload Assets</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardDescription>Published Courses</CardDescription>
              <CardTitle className="text-3xl">{loadingCourses ? '…' : publishedCount}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">Ready for students to enroll</CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardDescription>Total Courses</CardDescription>
              <CardTitle className="text-3xl">{loadingCourses ? '…' : courses.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">Including drafts and previews</CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardDescription>Quick insight</CardDescription>
                <CardTitle className="text-xl">Course readiness</CardTitle>
              </div>
              <Sparkles className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Need thumbnails</span>
                <Badge variant="outline">{courses.filter((c) => !c.thumbnailUrl).length}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Not published</span>
                <Badge variant="secondary">{courses.filter((c) => !c.isPublished).length}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Card key={link.to} className="shadow-soft hover:shadow-glow transition-smooth">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <link.icon className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{link.title}</CardTitle>
                    <CardDescription>{link.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to={link.to}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listInstructorCourses } from '@/api/instructor';
import { Course } from '@/api/courses';
import { toast } from '@/hooks/use-toast';
import { Layers3 } from 'lucide-react';

export default function InstructorCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
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
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center gap-2 text-primary">
          <Layers3 className="h-4 w-4" />
          <span className="text-sm font-semibold uppercase tracking-wide">Course Editor</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold">Edit your courses</h1>
            <p className="text-muted-foreground">Open a course to manage chapters, lessons, and publishing state.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading && <p className="text-muted-foreground">Loading courses…</p>}
          {!loading &&
            courses.map((course) => (
              <Card key={course.id} className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {course.title}
                    {!course.isPublished && <Badge variant="secondary">Draft</Badge>}
                  </CardTitle>
                  <CardDescription>{course.shortDescription}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">{course.slug}</div>
                  <Button asChild variant="outline">
                    <Link to={`/instructor/course/${course.slug}`}>Open</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          {!loading && courses.length === 0 && <p className="text-muted-foreground">No courses yet.</p>}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { uploadFile } from '@/api/uploads';
import {
  fetchInstructorCourseBySlug,
  listInstructorCourses,
  updateInstructorLesson,
} from '@/api/instructor';
import { Chapter, Course, Lesson } from '@/api/courses';
import { toast } from '@/hooks/use-toast';
import { FileUp, FolderTree } from 'lucide-react';

export default function LessonsManager() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [courseChapters, setCourseChapters] = useState<Chapter[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [notebookUrl, setNotebookUrl] = useState('');
  const [notesContent, setNotesContent] = useState('');

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
      }
    };

    loadCourses();
  }, []);

  const lessons = useMemo(() => courseChapters.flatMap((chapter) => chapter.lessons), [courseChapters]);

  useEffect(() => {
    if (!activeLesson) return;
    setTitle(activeLesson.title || '');
    setDescription(activeLesson.description || '');
    setVideoUrl(activeLesson.videoUrl || '');
    setNotebookUrl(activeLesson.colabNotebookUrl || '');
    setNotesContent(activeLesson.notesContent || '');
  }, [activeLesson]);

  const handleCourseSelect = async (slug: string) => {
    setSelectedCourse(slug);
    setLoading(true);
    try {
      const { chapters } = await fetchInstructorCourseBySlug(slug);
      setCourseChapters(chapters);
      setActiveLesson(chapters[0]?.lessons?.[0] ?? null);
    } catch (error) {
      toast({
        title: 'Failed to load lessons',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!activeLesson) return;
    setSaving(true);
    try {
      const updated = await updateInstructorLesson(activeLesson.id, {
        title,
        description,
        videoUrl,
        colabNotebookUrl: notebookUrl,
        notesContent,
        orderIndex: activeLesson.orderIndex,
      });

      setCourseChapters((prev) =>
        prev.map((chapter) => ({
          ...chapter,
          lessons: chapter.lessons.map((lesson) => (lesson.id === activeLesson.id ? updated : lesson)),
        }))
      );
      setActiveLesson(updated);
      toast({ title: 'Lesson updated' });
    } catch (error) {
      toast({
        title: 'Unable to save lesson',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length || !activeLesson) return;
    setUploading(true);
    try {
      const [file] = Array.from(fileList);
      const response = await uploadFile(file);
      if (response.url) {
        setVideoUrl(response.url);
        const updated = await updateInstructorLesson(activeLesson.id, {
          title,
          description,
          videoUrl: response.url,
          colabNotebookUrl: notebookUrl,
          notesContent,
          orderIndex: activeLesson.orderIndex,
        });
        setCourseChapters((prev) =>
          prev.map((chapter) => ({
            ...chapter,
            lessons: chapter.lessons.map((lesson) => (lesson.id === activeLesson.id ? updated : lesson)),
          }))
        );
        setActiveLesson(updated);
        toast({
          title: 'Upload complete',
          description: 'Video URL attached to lesson.',
        });
      }
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-wide text-primary flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              Lessons
            </p>
            <h1 className="text-3xl font-display font-bold">Content Manager</h1>
            <p className="text-muted-foreground">Upload, organize, and attach assets to each lesson.</p>
          </div>
          <Badge variant="secondary">{lessons.length} lessons</Badge>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Select course</CardTitle>
            <CardDescription>Pick a course to load its chapters and lessons.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedCourse} onValueChange={handleCourseSelect}>
              <SelectTrigger className="w-full md:w-1/2">
                <SelectValue placeholder="Choose a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.slug} value={course.slug}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid md:grid-cols-3 gap-3">
              {courseChapters.map((chapter) => (
                <Card key={chapter.id} className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{chapter.title}</CardTitle>
                    <CardDescription>{chapter.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {chapter.lessons.map((lesson) => (
                      <Button
                        key={lesson.id}
                        variant={activeLesson?.id === lesson.id ? 'default' : 'outline'}
                        className="w-full justify-start"
                        onClick={() => setActiveLesson(lesson)}
                      >
                        <div className="flex flex-col text-left">
                          <span className="font-medium">{lesson.title || 'Untitled lesson'}</span>
                          <span className="text-xs text-muted-foreground">
                            {lesson.videoUrl ? 'Video attached' : 'No video yet'}
                          </span>
                        </div>
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {activeLesson && (
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Edit lesson content</CardTitle>
                  <CardDescription>Save updates or attach uploads directly to this lesson.</CardDescription>
                </div>
                <Button disabled={saving} onClick={handleSave}>
                  {saving ? 'Saving…' : 'Save lesson'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lesson-title">Title</Label>
                  <Input id="lesson-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lesson-video">Video URL</Label>
                  <Input id="lesson-video" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lesson-notebook">Colab Notebook URL</Label>
                  <Input id="lesson-notebook" value={notebookUrl} onChange={(e) => setNotebookUrl(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lesson-notes">Notes</Label>
                  <Textarea
                    id="lesson-notes"
                    value={notesContent}
                    onChange={(e) => setNotesContent(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Upload and attach video</Label>
                <div className="flex items-center gap-3">
                  <Input type="file" accept="video/*" onChange={(e) => handleUpload(e.target.files)} />
                  <Button variant="outline" disabled>{uploading ? 'Uploading…' : 'Attach file'}</Button>
                  <FileUp className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Files are uploaded to the instructor media bucket and the returned URL is saved on the lesson.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!activeLesson && !loading && selectedCourse && (
          <Card className="shadow-soft">
            <CardContent className="py-6 text-muted-foreground text-center">Select a lesson to get started.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

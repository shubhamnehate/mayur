import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Plus, Trash2, GripVertical, ExternalLink } from 'lucide-react';
import { Chapter, Course, Lesson, fetchCourseBySlug, updateCourse, createChapter, updateChapter, deleteChapter } from '@/api/courses';
import { createLesson, deleteLesson, updateLesson } from '@/api/lessons';

const AdminCourseEditor = () => {
  const { courseSlug } = useParams();
  const navigate = useNavigate();
  const { user, loading, hasRole } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Course form fields
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [priceEur, setPriceEur] = useState('');
  const [priceInr, setPriceInr] = useState('');
  const [googleClassroomUrl, setGoogleClassroomUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [stripePaymentLinkEur, setStripePaymentLinkEur] = useState('');
  const [stripePaymentLinkInr, setStripePaymentLinkInr] = useState('');

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  useEffect(() => {
    if (!loading && (!user || (!hasRole('instructor') && !hasRole('admin')))) {
      navigate('/dashboard');
    }
  }, [user, loading, hasRole, navigate]);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseSlug) return;

      try {
        const content = await fetchCourseBySlug(courseSlug);
        setCourse(content as Course);
        setChapters(content.chapters || []);

        setTitle(content.title || '');
        setShortDescription(content.shortDescription || '');
        setFullDescription(content.fullDescription || '');
        setPriceEur(content.priceEur?.toString() || '');
        setPriceInr(content.priceInr?.toString() || '');
        setGoogleClassroomUrl(content.googleClassroomUrl || '');
        setThumbnailUrl(content.thumbnailUrl || '');
        setIsPublished(content.isPublished || false);
        setStripePaymentLinkEur(content.stripePaymentLinkEur || '');
        setStripePaymentLinkInr(content.stripePaymentLinkInr || '');
      } catch (error) {
        toast({
          title: 'Error loading course',
          description: getErrorMessage(error, 'Unable to load course data'),
          variant: 'destructive'
        });
      }
    };

    fetchCourse();
  }, [courseSlug]);

  const handleSaveCourse = async () => {
    if (!course?.id) return;
    setSaving(true);

    try {
      const updated = await updateCourse(course.id, {
        title,
        shortDescription,
        fullDescription,
        priceEur: parseFloat(priceEur) || 0,
        priceInr: parseFloat(priceInr) || 0,
        googleClassroomUrl,
        thumbnailUrl,
        isPublished,
        stripePaymentLinkEur: stripePaymentLinkEur || null,
        stripePaymentLinkInr: stripePaymentLinkInr || null
      });
      setCourse(updated);

      toast({
        title: 'Course saved',
        description: 'Course details updated successfully.'
      });
    } catch (error) {
      toast({
        title: 'Error saving course',
        description: getErrorMessage(error, 'Unable to save course'),
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddChapter = async () => {
    if (!course?.id) return;

    try {
      const newChapter = await createChapter(course.id, {
        title: 'New Chapter',
        description: '',
        orderIndex: chapters.length
      });

      setChapters([...chapters, { ...newChapter, lessons: newChapter.lessons || [] }]);
      toast({ title: 'Chapter added' });
    } catch (error) {
      toast({
        title: 'Error adding chapter',
        description: getErrorMessage(error, 'Unable to add chapter'),
        variant: 'destructive'
      });
    }
  };

  const handleUpdateChapter = async (chapterId: string, updates: Partial<Chapter>) => {
    try {
      const updated = await updateChapter(chapterId, {
        title: updates.title,
        description: updates.description,
        orderIndex: updates.orderIndex,
      });

      setChapters(chapters.map(ch => 
        ch.id === chapterId ? { ...ch, ...updated } : ch
      ));
    } catch (error) {
      toast({
        title: 'Error updating chapter',
        description: getErrorMessage(error, 'Unable to update chapter'),
        variant: 'destructive'
      });
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    try {
      await deleteChapter(chapterId);
      setChapters(chapters.filter(ch => ch.id !== chapterId));
      toast({ title: 'Chapter deleted' });
    } catch (error) {
      toast({
        title: 'Error deleting chapter',
        description: getErrorMessage(error, 'Unable to delete chapter'),
        variant: 'destructive'
      });
    }
  };

  const handleAddLesson = async (chapterId: string) => {
    const chapter = chapters.find(ch => ch.id === chapterId);
    if (!chapter) return;

    try {
      const newLesson = await createLesson(chapterId, {
        title: 'New Lesson',
        description: '',
        videoUrl: '',
        colabNotebookUrl: '',
        notesContent: '',
        orderIndex: chapter.lessons.length
      });

      setChapters(chapters.map(ch => 
        ch.id === chapterId 
          ? { ...ch, lessons: [...ch.lessons, newLesson] }
          : ch
      ));
      toast({ title: 'Lesson added' });
    } catch (error) {
      toast({
        title: 'Error adding lesson',
        description: getErrorMessage(error, 'Unable to add lesson'),
        variant: 'destructive'
      });
    }
  };

  const handleUpdateLesson = async (lessonId: string, chapterId: string, updates: Partial<Lesson>) => {
    try {
      const updated = await updateLesson(lessonId, {
        title: updates.title,
        description: updates.description,
        videoUrl: updates.videoUrl,
        colabNotebookUrl: updates.colabNotebookUrl,
        notesContent: updates.notesContent,
        orderIndex: updates.orderIndex,
      });

      setChapters(chapters.map(ch => 
        ch.id === chapterId 
          ? { ...ch, lessons: ch.lessons.map(l => l.id === lessonId ? { ...l, ...updated } : l) }
          : ch
      ));
    } catch (error) {
      toast({
        title: 'Error updating lesson',
        description: getErrorMessage(error, 'Unable to update lesson'),
        variant: 'destructive'
      });
    }
  };

  const handleDeleteLesson = async (lessonId: string, chapterId: string) => {
    try {
      await deleteLesson(lessonId);

      setChapters(chapters.map(ch => 
        ch.id === chapterId 
          ? { ...ch, lessons: ch.lessons.filter(l => l.id !== lessonId) }
          : ch
      ));
      toast({ title: 'Lesson deleted' });
    } catch (error) {
      toast({
        title: 'Error deleting lesson',
        description: getErrorMessage(error, 'Unable to delete lesson'),
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/admin')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin Panel
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">{title || 'Edit Course'}</h1>
            <p className="text-muted-foreground mt-1">Manage course content and settings</p>
          </div>
          <Button onClick={handleSaveCourse} disabled={saving} className="gradient-primary">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Course'}
          </Button>
        </div>

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList>
            <TabsTrigger value="details">Course Details</TabsTrigger>
            <TabsTrigger value="content">Chapters & Lessons</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Course Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., AI Bootcamp"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thumbnail">Thumbnail URL</Label>
                    <Input
                      id="thumbnail"
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="shortDesc">Short Description</Label>
                  <Input
                    id="shortDesc"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Brief course overview"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullDesc">Full Description</Label>
                  <Textarea
                    id="fullDesc"
                    value={fullDescription}
                    onChange={(e) => setFullDescription(e.target.value)}
                    placeholder="Detailed course description..."
                    rows={5}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priceEur">Price (EUR)</Label>
                    <Input
                      id="priceEur"
                      type="number"
                      value={priceEur}
                      onChange={(e) => setPriceEur(e.target.value)}
                      placeholder="99"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceInr">Price (INR)</Label>
                    <Input
                      id="priceInr"
                      type="number"
                      value={priceInr}
                      onChange={(e) => setPriceInr(e.target.value)}
                      placeholder="9999"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="classroom">Google Classroom URL (Optional)</Label>
                  <Input
                    id="classroom"
                    value={googleClassroomUrl}
                    onChange={(e) => setGoogleClassroomUrl(e.target.value)}
                    placeholder="https://classroom.google.com/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Link to existing Google Classroom for this course
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stripeEur">Stripe Payment Link (EUR)</Label>
                    <Input
                      id="stripeEur"
                      value={stripePaymentLinkEur}
                      onChange={(e) => setStripePaymentLinkEur(e.target.value)}
                      placeholder="https://buy.stripe.com/..."
                    />
                    <p className="text-xs text-muted-foreground">
                      For international payments in EUR
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stripeInr">Stripe Payment Link (INR)</Label>
                    <Input
                      id="stripeInr"
                      value={stripePaymentLinkInr}
                      onChange={(e) => setStripePaymentLinkInr(e.target.value)}
                      placeholder="https://buy.stripe.com/..."
                    />
                    <p className="text-xs text-muted-foreground">
                      For Indian payments in INR
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Chapters & Lessons</CardTitle>
                  <CardDescription>
                    Organize your course content. Add video URLs from Google Drive or YouTube.
                  </CardDescription>
                </div>
                <Button onClick={handleAddChapter}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Chapter
                </Button>
              </CardHeader>
              <CardContent>
                {chapters.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No chapters yet. Click "Add Chapter" to get started.</p>
                  </div>
                ) : (
                  <Accordion type="multiple" className="space-y-4">
                    {chapters.map((chapter, chapterIndex) => (
                      <AccordionItem key={chapter.id} value={chapter.id!} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 flex-1">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              Chapter {chapterIndex + 1}: {chapter.title}
                            </span>
                            <span className="text-sm text-muted-foreground ml-auto mr-4">
                              {chapter.lessons.length} lessons
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
                            <div className="space-y-2">
                              <Label>Chapter Title</Label>
                              <Input
                                value={chapter.title}
                                onChange={(e) => handleUpdateChapter(chapter.id!, { title: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Input
                                value={chapter.description || ''}
                                onChange={(e) => handleUpdateChapter(chapter.id!, { description: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Lessons</h4>
                              <Button size="sm" variant="outline" onClick={() => handleAddLesson(chapter.id!)}>
                                <Plus className="h-3 w-3 mr-1" />
                                Add Lesson
                              </Button>
                            </div>

                            {chapter.lessons.map((lesson, lessonIndex) => (
                              <Card key={lesson.id} className="p-4 bg-muted/30">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Lesson {lessonIndex + 1}</span>
                                    <Button 
                                      size="icon" 
                                      variant="ghost"
                                      onClick={() => handleDeleteLesson(lesson.id!, chapter.id!)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Title</Label>
                                      <Input
                                        value={lesson.title}
                                        onChange={(e) => handleUpdateLesson(lesson.id!, chapter.id!, { title: e.target.value })}
                                        placeholder="Lesson title"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Video URL (Google Drive/YouTube)</Label>
                                      <Input
                                        value={lesson.videoUrl || ''}
                                        onChange={(e) => handleUpdateLesson(lesson.id!, chapter.id!, { videoUrl: e.target.value })}
                                        placeholder="https://drive.google.com/..."
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Colab Notebook URL</Label>
                                      <Input
                                        value={lesson.colabNotebookUrl || ''}
                                        onChange={(e) => handleUpdateLesson(lesson.id!, chapter.id!, { colabNotebookUrl: e.target.value })}
                                        placeholder="https://colab.research.google.com/..."
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Description</Label>
                                      <Input
                                        value={lesson.description || ''}
                                        onChange={(e) => handleUpdateLesson(lesson.id!, chapter.id!, { description: e.target.value })}
                                        placeholder="Brief description"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Notes (Markdown)</Label>
                                    <Textarea
                                      value={lesson.notesContent || ''}
                                      onChange={(e) => handleUpdateLesson(lesson.id!, chapter.id!, { notesContent: e.target.value })}
                                      placeholder="Lesson notes in markdown..."
                                      rows={3}
                                    />
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>

                          <div className="flex justify-end pt-2">
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeleteChapter(chapter.id!)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Chapter
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Publishing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Published</Label>
                    <p className="text-sm text-muted-foreground">
                      Make this course visible to students
                    </p>
                  </div>
                  <Switch
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                  />
                </div>
              </CardContent>
            </Card>

            {googleClassroomUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>External Links</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" asChild>
                    <a href={googleClassroomUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Google Classroom
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminCourseEditor;

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Users, BookOpen, Bell, Plus, Search, CheckCircle, XCircle, Award } from 'lucide-react';
import CertificateManagement from '@/components/admin/CertificateManagement';
import { Course, listCourses } from '@/api/courses';
import { createEnrollment, Enrollment, fetchEnrollments, updateEnrollmentStatus } from '@/api/enrollments';
import { createAnnouncement } from '@/api/classwork';

const AdminPanel = () => {
  const { user, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [manualEnrollEmail, setManualEnrollEmail] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementCourse, setAnnouncementCourse] = useState('global');

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  useEffect(() => {
    if (!loading && (!user || (!hasRole('instructor') && !hasRole('admin')))) {
      navigate('/dashboard');
    }
  }, [user, loading, hasRole, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesData, enrollmentData] = await Promise.all([listCourses(), fetchEnrollments()]);
        setCourses(coursesData);
        setEnrollments(enrollmentData);
      } catch (error) {
        toast({
          title: 'Error loading admin data',
          description: getErrorMessage(error, 'Unable to load courses and enrollments'),
          variant: 'destructive',
        });
      }
    };

    if (user) fetchData();
  }, [user]);

  const handleManualEnroll = async () => {
    if (!manualEnrollEmail || !selectedCourse) {
      toast({
        title: 'Error',
        description: 'Please enter email and select a course',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createEnrollment({
        courseId: selectedCourse,
        email: manualEnrollEmail,
        paymentMethod: 'manual',
      });

      toast({
        title: 'Success',
        description: `${manualEnrollEmail} enrolled successfully!`,
      });
      setManualEnrollEmail('');
      setSelectedCourse('');

      const refreshedEnrollments = await fetchEnrollments();
      setEnrollments(refreshedEnrollments);
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Unable to enroll student'),
        variant: 'destructive',
      });
    }
  };

  const handleApprovePayment = async (enrollmentId: string) => {
    try {
      await updateEnrollmentStatus(enrollmentId, 'completed');

      setEnrollments(prev => 
        prev.map(e => e.id === enrollmentId ? { ...e, paymentStatus: 'completed' } : e)
      );
    
      toast({
        title: 'Payment approved',
        description: 'Student can now access the course.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Unable to update payment status'),
        variant: 'destructive',
      });
    }
  };

  const handlePostAnnouncement = async () => {
    if (!announcementTitle || !announcementContent) {
      toast({
        title: 'Error',
        description: 'Please fill in title and content',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createAnnouncement({
        title: announcementTitle,
        content: announcementContent,
        courseId: announcementCourse === 'global' ? null : announcementCourse,
        isGlobal: announcementCourse === 'global',
      });

      toast({
        title: 'Announcement posted',
        description: 'Students will be notified.',
      });
      setAnnouncementTitle('');
      setAnnouncementContent('');
      setAnnouncementCourse('global');
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Unable to post announcement'),
        variant: 'destructive',
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
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold">Instructor Panel</h1>
          <p className="text-muted-foreground mt-1">
            Manage enrollments, content, and announcements
          </p>
        </div>

        <Tabs defaultValue="enrollments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="enrollments" className="gap-2">
              <Users className="h-4 w-4" />
              Enrollments
            </TabsTrigger>
            <TabsTrigger value="certificates" className="gap-2">
              <Award className="h-4 w-4" />
              Certificates
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-2">
              <Bell className="h-4 w-4" />
              Announcements
            </TabsTrigger>
          </TabsList>

          {/* Enrollments Tab */}
          <TabsContent value="enrollments" className="space-y-6">
            {/* Manual Enrollment */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Manual Enrollment
                </CardTitle>
                <CardDescription>
                  Enroll a student manually (bypass payment)
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="enroll-email">Student Email</Label>
                  <Input
                    id="enroll-email"
                    type="email"
                    placeholder="student@example.com"
                    value={manualEnrollEmail}
                    onChange={(e) => setManualEnrollEmail(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="enroll-course">Course</Label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleManualEnroll} className="gradient-primary">
                    Enroll Student
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enrollments List */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Recent Enrollments</CardTitle>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
                      className="pl-9"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments
                      .filter(e => 
                        !searchEmail || 
                        e.studentName?.toLowerCase().includes(searchEmail.toLowerCase()) ||
                        e.studentEmail?.toLowerCase().includes(searchEmail.toLowerCase())
                      )
                      .map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell>{enrollment.studentName || enrollment.studentEmail || 'Unknown'}</TableCell>
                          <TableCell>{enrollment.course?.title}</TableCell>
                          <TableCell>
                            <Badge variant={enrollment.paymentStatus === 'completed' ? 'default' : 'secondary'}>
                              {enrollment.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {enrollment.enrolledAt ? new Date(enrollment.enrolledAt).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            {enrollment.paymentStatus !== 'completed' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleApprovePayment(enrollment.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certificates Tab */}
          <TabsContent value="certificates">
            <CertificateManagement />
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Course Content Management</CardTitle>
                <CardDescription>
                  Manage lessons, videos, and materials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map((course) => (
                    <Card key={course.id} className="border-border/50 hover:shadow-soft transition-shadow cursor-pointer">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{course.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => navigate(`/admin/course/${course.slug}`)}
                        >
                          Manage Content
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Post Announcement</CardTitle>
                <CardDescription>
                  Send notifications to your students
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="announcement-course">Target</Label>
                  <Select value={announcementCourse} onValueChange={setAnnouncementCourse}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">All Students (Global)</SelectItem>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="announcement-title">Title</Label>
                  <Input
                    id="announcement-title"
                    placeholder="Announcement title"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="announcement-content">Content</Label>
                  <Textarea
                    id="announcement-content"
                    placeholder="Write your announcement..."
                    rows={4}
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                  />
                </div>
                <Button onClick={handlePostAnnouncement} className="gradient-primary">
                  Post Announcement
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPanel;

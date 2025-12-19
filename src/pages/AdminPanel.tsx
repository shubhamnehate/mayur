import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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

const AdminPanel = () => {
  const { user, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [manualEnrollEmail, setManualEnrollEmail] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementCourse, setAnnouncementCourse] = useState('global');

  useEffect(() => {
    if (!loading && (!user || (!hasRole('instructor') && !hasRole('admin')))) {
      navigate('/dashboard');
    }
  }, [user, loading, hasRole, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title, slug')
        .order('title');
      
      if (coursesData) setCourses(coursesData);

      // Fetch enrollments with user profiles
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select(`
          id,
          enrolled_at,
          payment_status,
          payment_method,
          course:courses (id, title),
          user_id
        `)
        .order('enrolled_at', { ascending: false });

      if (enrollmentsData) {
        // Fetch profiles for each enrollment
        const enrichedEnrollments = await Promise.all(
          enrollmentsData.map(async (enrollment) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', enrollment.user_id)
              .single();
            
            return {
              ...enrollment,
              profile,
            };
          })
        );
        setEnrollments(enrichedEnrollments);
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

    // Search for user by email - first try exact match in profiles.email
    let { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .or(`email.ilike.%${manualEnrollEmail}%,full_name.ilike.%${manualEnrollEmail}%`);

    if (!profiles || profiles.length === 0) {
      toast({
        title: 'User not found',
        description: 'No user found matching that email/name. Please ensure the student has signed up first.',
        variant: 'destructive',
      });
      return;
    }

    const targetUserId = profiles[0].user_id;

    const { error } = await supabase
      .from('enrollments')
      .insert({
        user_id: targetUserId,
        course_id: selectedCourse,
        payment_status: 'completed',
        payment_method: 'manual',
      });

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Already enrolled',
          description: 'This user is already enrolled in this course.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
      return;
    }

    toast({
      title: 'Success',
      description: `${profiles[0].full_name || manualEnrollEmail} enrolled successfully!`,
    });
    setManualEnrollEmail('');
    setSelectedCourse('');
    
    // Refresh enrollments
    const { data: enrollmentsData } = await supabase
      .from('enrollments')
      .select(`
        id,
        enrolled_at,
        payment_status,
        payment_method,
        course:courses (id, title),
        user_id
      `)
      .order('enrolled_at', { ascending: false });

    if (enrollmentsData) {
      const enrichedEnrollments = await Promise.all(
        enrollmentsData.map(async (enrollment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', enrollment.user_id)
            .single();
          
          return {
            ...enrollment,
            profile,
          };
        })
      );
      setEnrollments(enrichedEnrollments);
    }
  };

  const handleApprovePayment = async (enrollmentId: string) => {
    const { error } = await supabase
      .from('enrollments')
      .update({ payment_status: 'completed' })
      .eq('id', enrollmentId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setEnrollments(prev => 
      prev.map(e => e.id === enrollmentId ? { ...e, payment_status: 'completed' } : e)
    );
    
    toast({
      title: 'Payment approved',
      description: 'Student can now access the course.',
    });
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

    const { error } = await supabase
      .from('announcements')
      .insert({
        title: announcementTitle,
        content: announcementContent,
        course_id: announcementCourse === 'global' ? null : announcementCourse,
        is_global: announcementCourse === 'global',
        author_id: user?.id,
      });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Announcement posted',
      description: 'Students will be notified.',
    });
    setAnnouncementTitle('');
    setAnnouncementContent('');
    setAnnouncementCourse('global');
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
                        e.profile?.full_name?.toLowerCase().includes(searchEmail.toLowerCase())
                      )
                      .map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell>{enrollment.profile?.full_name || 'Unknown'}</TableCell>
                          <TableCell>{enrollment.course?.title}</TableCell>
                          <TableCell>
                            <Badge variant={enrollment.payment_status === 'completed' ? 'default' : 'secondary'}>
                              {enrollment.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(enrollment.enrolled_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {enrollment.payment_status !== 'completed' && (
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

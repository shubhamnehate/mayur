import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Play, Trophy, Clock, ExternalLink, GraduationCap, Award } from 'lucide-react';
import CertificatesSection from '@/components/dashboard/CertificatesSection';
import { Enrollment, fetchMyEnrollments } from '@/api/enrollments';

const Dashboard = () => {
  const { user, profile, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<Enrollment[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!user) return;

      try {
        const enrollments = await fetchMyEnrollments();
        setEnrolledCourses(enrollments);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchEnrollments();
  }, [user]);

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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold">
            Welcome back, {profile?.full_name || 'Learner'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Continue your learning journey
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-border/50 hover:shadow-soft transition-shadow cursor-pointer" onClick={() => navigate('/courses')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-lg bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Browse Courses</h3>
                <p className="text-sm text-muted-foreground">Explore all bootcamps</p>
              </div>
            </CardContent>
          </Card>

          {(hasRole('instructor') || hasRole('admin')) && (
            <Card className="border-border/50 hover:shadow-soft transition-shadow cursor-pointer" onClick={() => navigate('/admin')}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-lg bg-secondary/10">
                  <GraduationCap className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold">Instructor Panel</h3>
                  <p className="text-sm text-muted-foreground">Manage your courses</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/50">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-lg bg-accent/10">
                <Trophy className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">{enrolledCourses.length}</h3>
                <p className="text-sm text-muted-foreground">Courses Enrolled</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enrolled Courses */}
        <div>
          <h2 className="text-2xl font-display font-semibold mb-4">My Courses</h2>
          
          {loadingCourses ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-border/50">
                  <CardContent className="p-6">
                    <Skeleton className="h-40 w-full mb-4" />
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : enrolledCourses.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                <p className="text-muted-foreground mb-4">Start your learning journey today!</p>
                <Button onClick={() => navigate('/courses')} className="gradient-primary">
                  Browse Courses
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((enrollment) => {
                const progress =
                  enrollment.progressPercent ??
                  (enrollment.totalLessons
                    ? ((enrollment.completedLessons ?? 0) / enrollment.totalLessons) * 100
                    : 0);

                return (
                  <Card key={enrollment.id} className="border-border/50 hover:shadow-soft transition-shadow overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 relative">
                      {enrollment.course?.thumbnailUrl && (
                        <img 
                          src={enrollment.course.thumbnailUrl} 
                          alt={enrollment.course.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {enrollment.paymentStatus !== 'completed' && (
                        <Badge className="absolute top-2 right-2 bg-yellow-500">
                          Payment Pending
                        </Badge>
                      )}
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg line-clamp-2">
                        {enrollment.course?.title}
                      </CardTitle>
                      <CardDescription>
                        {enrollment.completedLessons ?? 0} / {enrollment.totalLessons ?? 0} lessons completed
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 gradient-primary" 
                          onClick={() => navigate(`/learn/${enrollment.course?.slug}`)}
                          disabled={enrollment.paymentStatus !== 'completed'}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Continue
                        </Button>
                        {enrollment.course?.googleClassroomUrl && (
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => {
                              if (enrollment.course?.googleClassroomUrl) {
                                window.open(enrollment.course.googleClassroomUrl, '_blank');
                              }
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Certificates Section */}
        <div className="mt-8">
          <CertificatesSection />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;

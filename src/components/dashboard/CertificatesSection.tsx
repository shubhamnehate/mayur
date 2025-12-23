import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Download, Clock, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Certificate, CourseCompletion, fetchCertificatesOverview, requestCertificate } from '@/api/classwork';

const CertificatesSection = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [completions, setCompletions] = useState<CourseCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const data = await fetchCertificatesOverview();
        setCertificates(data.certificates);
        setCompletions(data.completions);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const requestCertificate = async (courseId: string) => {
    if (!user) return;
    setRequesting(courseId);

    try {
      const certificate = await requestCertificate(courseId);

      toast({
        title: 'Certificate requested',
        description: 'Your certificate request is pending instructor approval.',
      });

      setCertificates(prev => [...prev, certificate]);
      setCompletions(prev => prev.map(c => 
        c.courseId === courseId ? { ...c, hasCertificate: true } : c
      ));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to request certificate';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setRequesting(null);
    }
  };

  const downloadCertificate = (cert: Certificate) => {
    // Generate a simple certificate (in production, this would be a PDF generator)
    const certContent = `
CERTIFICATE OF COMPLETION

This certifies that the holder has successfully completed

${cert.course?.title}

Certificate Number: ${cert.certificateNumber}
Issue Date: ${cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : 'Pending'}

CloudBee Robotics Academy
    `.trim();

    const blob = new Blob([certContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${cert.certificateNumber ?? 'pending'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-semibold">Certificates</h2>

      {/* Completed courses eligible for certificates */}
      {completions.filter(c => c.isComplete && !c.hasCertificate).length > 0 && (
        <Card className="border-border/50 border-green-500/50 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Courses Completed - Request Certificate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completions.filter(c => c.isComplete && !c.hasCertificate).map(completion => (
              <div key={completion.courseId} className="flex items-center justify-between p-3 rounded-lg bg-background">
                <div>
                  <h4 className="font-medium">{completion.courseTitle}</h4>
                  <p className="text-sm text-muted-foreground">
                    {completion.completedLessons}/{completion.totalLessons} lessons completed
                  </p>
                </div>
                <Button
                  onClick={() => requestCertificate(completion.courseId)}
                  disabled={requesting === completion.courseId}
                  className="gradient-primary"
                >
                  <Award className="h-4 w-4 mr-2" />
                  {requesting === completion.courseId ? 'Requesting...' : 'Request Certificate'}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Existing certificates */}
      {certificates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {certificates.map(cert => (
            <Card key={cert.id} className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{cert.course?.title}</CardTitle>
                  <Badge variant={cert.status === 'approved' ? 'default' : 'secondary'}>
                    {cert.status === 'approved' ? 'Issued' : cert.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {cert.status === 'approved' ? (
                  <>
                    <div className="text-sm text-muted-foreground">
                      <p>Certificate #: {cert.certificateNumber}</p>
                      <p>Issued: {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : '-'}</p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => downloadCertificate(cert)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Certificate
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Pending instructor approval</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : completions.filter(c => c.isComplete).length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-8 text-center">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No certificates yet</h3>
            <p className="text-muted-foreground">
              Complete a course to earn your certificate!
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default CertificatesSection;

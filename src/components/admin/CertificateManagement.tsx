import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Award, Clock } from 'lucide-react';

interface CertificateRequest {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  certificate_number: string | null;
  issued_at: string | null;
  created_at: string;
  course: {
    title: string;
  };
  profile: {
    full_name: string | null;
    email: string | null;
  } | null;
}

const CertificateManagement = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<CertificateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, [user]);

  const fetchCertificates = async () => {
    const { data: certs, error } = await supabase
      .from('certificates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching certificates:', error);
      return;
    }

    // Fetch course and profile data for each certificate
    const enrichedCerts = await Promise.all(
      (certs || []).map(async (cert) => {
        const { data: course } = await supabase
          .from('courses')
          .select('title')
          .eq('id', cert.course_id)
          .maybeSingle();

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('user_id', cert.user_id)
          .maybeSingle();

        return {
          ...cert,
          course: course || { title: 'Unknown Course' },
          profile,
        };
      })
    );

    setCertificates(enrichedCerts as CertificateRequest[]);
    setLoading(false);
  };

  const handleApprove = async (certId: string) => {
    setProcessing(certId);

    const { error } = await supabase
      .from('certificates')
      .update({ 
        status: 'approved',
        approved_by: user?.id,
      })
      .eq('id', certId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Certificate approved',
        description: 'The student can now download their certificate.',
      });
      fetchCertificates();
    }

    setProcessing(null);
  };

  const handleReject = async (certId: string) => {
    setProcessing(certId);

    const { error } = await supabase
      .from('certificates')
      .update({ status: 'rejected' })
      .eq('id', certId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Certificate rejected',
        description: 'The request has been rejected.',
      });
      fetchCertificates();
    }

    setProcessing(null);
  };

  const pendingCerts = certificates.filter(c => c.status === 'pending');
  const processedCerts = certificates.filter(c => c.status !== 'pending');

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
      {/* Pending Requests */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Certificate Requests
            {pendingCerts.length > 0 && (
              <Badge variant="secondary">{pendingCerts.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Review and approve certificate requests from students
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingCerts.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No pending certificate requests
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingCerts.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{cert.profile?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{cert.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{cert.course?.title}</TableCell>
                    <TableCell>{new Date(cert.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(cert.id)}
                          disabled={processing === cert.id}
                          className="gradient-primary"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(cert.id)}
                          disabled={processing === cert.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Processed Certificates */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Issued Certificates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processedCerts.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No certificates issued yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Certificate #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedCerts.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell>{cert.profile?.full_name || 'Unknown'}</TableCell>
                    <TableCell>{cert.course?.title}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {cert.certificate_number || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cert.status === 'approved' ? 'default' : 'destructive'}>
                        {cert.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CertificateManagement;

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Award, Clock } from 'lucide-react';
import { Certificate, fetchCertificateRequests, updateCertificateStatus } from '@/api/classwork';

const CertificateManagement = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, [user]);

  const fetchCertificates = async () => {
    try {
      const data = await fetchCertificateRequests();
      setCertificates(data);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (certId: string) => {
    setProcessing(certId);

    try {
      await updateCertificateStatus(certId, 'approved');
      toast({
        title: 'Certificate approved',
        description: 'The student can now download their certificate.',
      });
      fetchCertificates();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to approve certificate';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }

    setProcessing(null);
  };

  const handleReject = async (certId: string) => {
    setProcessing(certId);

    try {
      await updateCertificateStatus(certId, 'rejected');
      toast({
        title: 'Certificate rejected',
        description: 'The request has been rejected.',
      });
      fetchCertificates();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reject certificate';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
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
                        <p className="font-medium">{cert.profile?.fullName || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{cert.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{cert.course?.title}</TableCell>
                    <TableCell>{cert.createdAt ? new Date(cert.createdAt).toLocaleDateString() : '-'}</TableCell>
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
                    <TableCell>{cert.profile?.fullName || 'Unknown'}</TableCell>
                    <TableCell>{cert.course?.title}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {cert.certificateNumber || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cert.status === 'approved' ? 'default' : 'destructive'}>
                        {cert.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : '-'}
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

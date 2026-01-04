import { useState } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { uploadFile } from '@/api/uploads';
import { toast } from '@/hooks/use-toast';
import { FileUp, Link as LinkIcon } from 'lucide-react';

interface UploadItem {
  name: string;
  url: string;
}

export default function Uploads() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setUploading(true);

    try {
      const [file] = Array.from(fileList);
      const response = await uploadFile(file);
      if (response.url) {
        setUploads((prev) => [{ name: file.name, url: response.url as string }, ...prev]);
        toast({ title: 'Upload complete', description: 'URL ready to attach to lessons or classwork.' });
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
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-primary flex items-center gap-2">
            <FileUp className="h-4 w-4" /> Uploads
          </p>
          <h1 className="text-3xl font-display font-bold">Instructor uploads</h1>
          <p className="text-muted-foreground">Use the dedicated instructor endpoint for lesson and classwork files.</p>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>New upload</CardTitle>
            <CardDescription>Files are stored through /api/instructor/uploads and return an accessible URL.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="upload-input">Choose a file</Label>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Input id="upload-input" type="file" onChange={(e) => handleUpload(e.target.files)} />
              <Button disabled={uploading}>{uploading ? 'Uploading…' : 'Upload'}</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              You can paste the returned URL into Lessons Manager or Classwork Manager to attach the file.
            </p>
          </CardContent>
        </Card>

        {uploads.length > 0 && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Recent uploads</CardTitle>
              <CardDescription>Copy and share URLs with your team.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {uploads.map((item) => (
                <div
                  key={item.url}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-border/70 rounded-lg p-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" /> {item.name}
                    </p>
                    <code className="text-xs break-all text-muted-foreground">{item.url}</code>
                  </div>
                  <Badge variant="outline" className="cursor-pointer" onClick={() => navigator.clipboard.writeText(item.url)}>
                    Copy URL
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

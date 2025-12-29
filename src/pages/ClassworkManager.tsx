import { useState } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { uploadFile } from '@/api/uploads';
import { attachClassworkResource } from '@/api/instructor';
import { toast } from '@/hooks/use-toast';
import { FileStack, Link as LinkIcon } from 'lucide-react';

export default function ClassworkManager() {
  const [classworkId, setClassworkId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<string | undefined>('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setUploading(true);
    try {
      const [file] = Array.from(fileList);
      const response = await uploadFile(file);
      if (response.url) {
        setResourceUrl(response.url);
        toast({ title: 'Upload complete', description: 'URL ready to attach.' });
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

  const handleAttach = async () => {
    if (!classworkId || !resourceUrl) {
      toast({
        title: 'Missing details',
        description: 'Classwork ID and resource URL are required.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await attachClassworkResource(classworkId, { title, url: resourceUrl, type: type || null });
      toast({ title: 'Resource attached', description: 'Students can now access this file.' });
      setTitle('');
      setType('');
    } catch (error) {
      toast({
        title: 'Unable to attach resource',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-10 space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-primary flex items-center gap-2">
            <FileStack className="h-4 w-4" /> Classwork Assets
          </p>
          <h1 className="text-3xl font-display font-bold">Attach uploads to assignments</h1>
          <p className="text-muted-foreground">Upload files and link them directly to quizzes or projects.</p>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Upload a new resource</CardTitle>
            <CardDescription>Use the instructor media endpoint to store large files.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classwork-id">Classwork or quiz ID</Label>
                <Input
                  id="classwork-id"
                  placeholder="e.g. quiz_123"
                  value={classworkId}
                  onChange={(e) => setClassworkId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resource-title">Title (optional)</Label>
                <Input
                  id="resource-title"
                  placeholder="Starter notebook"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Resource type</Label>
                <Select value={type ?? ''} onValueChange={(value) => setType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unspecified</SelectItem>
                    <SelectItem value="notebook">Notebook</SelectItem>
                    <SelectItem value="dataset">Dataset</SelectItem>
                    <SelectItem value="solution">Solution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resource-url">Resource URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="resource-url"
                    placeholder="Paste or upload to generate"
                    value={resourceUrl}
                    onChange={(e) => setResourceUrl(e.target.value)}
                  />
                  <Button variant="outline" asChild>
                    <label className="cursor-pointer flex items-center gap-2 px-3">
                      <FileStack className="h-4 w-4" />
                      <input type="file" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                      Upload
                    </label>
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resource-description">Notes for instructors</Label>
              <Textarea
                id="resource-description"
                placeholder="Document how to use this file with the assignment."
                rows={3}
                disabled
              />
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <LinkIcon className="h-3 w-3" /> Uploaded files are saved via <code>/api/instructor/uploads</code> and attached to the
                selected classwork.
              </p>
            </div>

            <Button onClick={handleAttach} disabled={saving || uploading} className="w-full md:w-auto">
              {saving ? 'Attaching…' : 'Attach to classwork'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

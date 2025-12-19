import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Code, ExternalLink } from 'lucide-react';

interface LessonContentProps {
  title: string;
  description: string | null;
  notesContent: string | null;
  colabUrl: string | null;
}

const LessonContent = ({ title, description, notesContent, colabUrl }: LessonContentProps) => {
  return (
    <div className="space-y-6">
      {/* Lesson Title */}
      <div>
        <h1 className="text-2xl font-display font-bold">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-2">{description}</p>
        )}
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="notes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notes" className="gap-2">
            <FileText className="h-4 w-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="code" className="gap-2" disabled={!colabUrl}>
            <Code className="h-4 w-4" />
            Code Lab
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-6">
              {notesContent ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {/* Render markdown-like content */}
                  {notesContent.split('\n').map((line, index) => {
                    if (line.startsWith('# ')) {
                      return <h2 key={index} className="text-xl font-bold mt-6 mb-3">{line.slice(2)}</h2>;
                    } else if (line.startsWith('## ')) {
                      return <h3 key={index} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h3>;
                    } else if (line.startsWith('### ')) {
                      return <h4 key={index} className="text-base font-medium mt-3 mb-2">{line.slice(4)}</h4>;
                    } else if (line.startsWith('- ')) {
                      return <li key={index} className="ml-4">{line.slice(2)}</li>;
                    } else if (line.startsWith('```')) {
                      return null; // Handle code blocks differently if needed
                    } else if (line.trim() === '') {
                      return <br key={index} />;
                    } else {
                      return <p key={index} className="mb-2">{line}</p>;
                    }
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No notes available for this lesson yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="code" className="mt-4">
          {colabUrl ? (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Interactive Code Lab</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(colabUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Colab
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Embed Colab notebook */}
                <div className="aspect-[16/9] border-t border-border/50">
                  <iframe
                    src={colabUrl.replace('github.com', 'colab.research.google.com/github').replace('/blob/', '/blob/')}
                    className="w-full h-full"
                    title="Google Colab Notebook"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="p-4 bg-muted/30 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    💡 <strong>Tip:</strong> Click "Open in Colab" to run the code interactively. You can make a copy to save your changes.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No code lab available for this lesson.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LessonContent;

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SkipBack, SkipForward } from 'lucide-react';
import { fetchVideoClips, VideoClip } from '@/api/lessons';


interface VideoPlayerProps {
  videoUrl: string;
  lessonId: string;
}

const VideoPlayer = ({ videoUrl, lessonId }: VideoPlayerProps) => {
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);

  useEffect(() => {
    const fetchClips = async () => {
      const data = await fetchVideoClips(lessonId);
      if (data && data.length > 0) {
        setClips(data);
      }
    };

    fetchClips();
  }, [lessonId]);

  // Convert Google Drive URL to embeddable format
  const getEmbedUrl = (url: string) => {
    // Handle Google Drive URLs
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
    
    // Handle YouTube URLs
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    
    return url;
  };

  const currentClip = clips[currentClipIndex];
  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <div className="space-y-4">
      {/* Video iframe */}
      <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title="Lesson Video"
        />
      </div>

      {/* Video Clips Navigation */}
      {clips.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Video Segments</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentClipIndex(Math.max(0, currentClipIndex - 1))}
                  disabled={currentClipIndex === 0}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentClipIndex(Math.min(clips.length - 1, currentClipIndex + 1))}
                  disabled={currentClipIndex === clips.length - 1}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {clips.map((clip, index) => (
                <Badge
                  key={clip.id}
                  variant={index === currentClipIndex ? 'default' : 'outline'}
                  className="cursor-pointer transition-all hover:scale-105"
                  onClick={() => setCurrentClipIndex(index)}
                >
                  {clip.title}
                </Badge>
              ))}
            </div>

            {currentClip && currentClip.notes && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">📝 Notes for this segment</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {currentClip.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VideoPlayer;

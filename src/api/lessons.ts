import { client } from './client';
import { Lesson, normalizeLessonFromApi } from './courses';

export interface LessonPayload {
  title?: string;
  description?: string | null;
  videoUrl?: string | null;
  colabNotebookUrl?: string | null;
  notesContent?: string | null;
  orderIndex?: number;
}

export interface VideoClip {
  id: string;
  title: string;
  startSeconds: number;
  endSeconds: number | null;
  notes: string | null;
  orderIndex: number;
}

interface LessonApiResponse {
  id: string | number;
  title?: string;
  description?: string | null;
  video_url?: string | null;
  videoUrl?: string | null;
  colab_notebook_url?: string | null;
  colabNotebookUrl?: string | null;
  notes_content?: string | null;
  notesContent?: string | null;
  order_index?: number;
  orderIndex?: number;
}

interface VideoClipApi {
  id: string | number;
  title?: string;
  start_seconds?: number;
  startSeconds?: number;
  end_seconds?: number | null;
  endSeconds?: number | null;
  notes?: string | null;
  order_index?: number;
  orderIndex?: number;
}

const buildLessonPayload = (payload: LessonPayload) => ({
  title: payload.title,
  description: payload.description,
  video_url: payload.videoUrl,
  colab_notebook_url: payload.colabNotebookUrl,
  notes_content: payload.notesContent,
  order_index: payload.orderIndex,
});

const normalizeClip = (clip: VideoClipApi): VideoClip => ({
  id: String(clip.id),
  title: clip.title ?? '',
  startSeconds: clip.start_seconds ?? clip.startSeconds ?? 0,
  endSeconds: clip.end_seconds ?? clip.endSeconds ?? null,
  notes: clip.notes ?? null,
  orderIndex: clip.order_index ?? clip.orderIndex ?? 0,
});

export const createLesson = async (chapterId: string, payload: LessonPayload): Promise<Lesson> => {
  const { data } = await client.post<LessonApiResponse>(`/api/chapters/${chapterId}/lessons`, buildLessonPayload(payload));
  return normalizeLessonFromApi(data);
};

export const updateLesson = async (lessonId: string, payload: LessonPayload): Promise<Lesson> => {
  const { data } = await client.put<LessonApiResponse>(`/api/lessons/${lessonId}`, buildLessonPayload(payload));
  return normalizeLessonFromApi(data);
};

export const deleteLesson = async (lessonId: string): Promise<void> => {
  await client.delete(`/api/lessons/${lessonId}`);
};

export const fetchVideoClips = async (lessonId: string): Promise<VideoClip[]> => {
  const { data } = await client.get<{ clips?: VideoClipApi[] } | VideoClipApi[]>(`/api/lessons/${lessonId}/clips`);
  const clips = Array.isArray(data) ? data : data.clips ?? [];
  return clips.map(normalizeClip);
};

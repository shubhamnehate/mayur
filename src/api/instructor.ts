import { client } from './client';
import {
  Chapter,
  Course,
  CourseContent,
  Lesson,
  ChapterApiResponse,
  CourseApiResponse,
  LessonApiResponse,
  UpdateCoursePayload,
  ChapterPayload,
  normalizeChapterFromApi,
  normalizeCourseFromApi,
  normalizeLessonFromApi,
} from './courses';
import { LessonPayload } from './lessons';

const buildCoursePayload = (payload: UpdateCoursePayload) => ({
  title: payload.title,
  short_description: payload.shortDescription,
  full_description: payload.fullDescription,
  price_eur: payload.priceEur,
  price_inr: payload.priceInr,
  google_classroom_url: payload.googleClassroomUrl,
  thumbnail_url: payload.thumbnailUrl,
  is_published: payload.isPublished,
  stripe_payment_link_eur: payload.stripePaymentLinkEur,
  stripe_payment_link_inr: payload.stripePaymentLinkInr,
});

const buildChapterPayload = (payload: ChapterPayload) => ({
  title: payload.title,
  description: payload.description,
  order_index: payload.orderIndex,
});

const buildLessonPayload = (payload: LessonPayload) => ({
  title: payload.title,
  description: payload.description,
  video_url: payload.videoUrl,
  colab_notebook_url: payload.colabNotebookUrl,
  notes_content: payload.notesContent,
  order_index: payload.orderIndex,
});

export const listInstructorCourses = async (): Promise<Course[]> => {
  const { data } = await client.get<{ courses?: CourseApiResponse[] } | CourseApiResponse[]>(
    '/api/instructor/courses'
  );
  const coursesArray = Array.isArray(data) ? data : data.courses ?? [];
  return coursesArray.map(normalizeCourseFromApi);
};

export const fetchInstructorCourseBySlug = async (slug: string): Promise<CourseContent> => {
  const { data } = await client.get<CourseApiResponse | { course: CourseApiResponse; chapters?: ChapterApiResponse[] }>(
    `/api/instructor/courses/slug/${slug}`
  );

  const course = 'course' in data ? data.course : data;
  const chapters = 'chapters' in data ? data.chapters : course.chapters;

  return {
    ...normalizeCourseFromApi(course),
    chapters: (chapters ?? []).map(normalizeChapterFromApi),
  };
};

export const updateInstructorCourse = async (courseId: string, payload: UpdateCoursePayload): Promise<Course> => {
  const { data } = await client.put<CourseApiResponse>(`/api/instructor/courses/${courseId}`, buildCoursePayload(payload));
  return normalizeCourseFromApi(data);
};

export const createInstructorChapter = async (courseId: string, payload: ChapterPayload): Promise<Chapter> => {
  const { data } = await client.post<ChapterApiResponse>(
    `/api/instructor/courses/${courseId}/chapters`,
    buildChapterPayload(payload)
  );

  return {
    ...normalizeChapterFromApi(data),
    lessons: data.lessons?.map(normalizeLessonFromApi) ?? [],
  };
};

export const updateInstructorChapter = async (chapterId: string, payload: ChapterPayload): Promise<Chapter> => {
  const { data } = await client.put<ChapterApiResponse>(
    `/api/instructor/chapters/${chapterId}`,
    buildChapterPayload(payload)
  );

  return {
    ...normalizeChapterFromApi(data),
    lessons: data.lessons?.map(normalizeLessonFromApi) ?? [],
  };
};

export const deleteInstructorChapter = async (chapterId: string): Promise<void> => {
  await client.delete(`/api/instructor/chapters/${chapterId}`);
};

export const createInstructorLesson = async (chapterId: string, payload: LessonPayload): Promise<Lesson> => {
  const { data } = await client.post<LessonApiResponse>(
    `/api/instructor/chapters/${chapterId}/lessons`,
    buildLessonPayload(payload)
  );
  return normalizeLessonFromApi(data);
};

export const updateInstructorLesson = async (lessonId: string, payload: LessonPayload): Promise<Lesson> => {
  const { data } = await client.put<LessonApiResponse>(`/api/instructor/lessons/${lessonId}`, buildLessonPayload(payload));
  return normalizeLessonFromApi(data);
};

export const deleteInstructorLesson = async (lessonId: string): Promise<void> => {
  await client.delete(`/api/instructor/lessons/${lessonId}`);
};

export const attachClassworkResource = async (
  classworkId: string,
  payload: { title?: string; url: string; type?: string | null }
): Promise<void> => {
  await client.post(`/api/instructor/classwork/${classworkId}/resources`, {
    title: payload.title,
    url: payload.url,
    type: payload.type,
  });
};

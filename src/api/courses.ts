import { client } from './client';

export interface Course {
  id: string;
  slug: string;
  title: string;
  shortDescription?: string;
  fullDescription?: string;
  priceEur?: number;
  priceInr?: number;
  googleClassroomUrl?: string | null;
  thumbnailUrl?: string | null;
  isPublished?: boolean;
  stripePaymentLinkEur?: string | null;
  stripePaymentLinkInr?: string | null;
}

export interface Lesson {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  colabNotebookUrl: string | null;
  notesContent: string | null;
  orderIndex: number;
  completed?: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  lessons: Lesson[];
  quizId?: string | null;
  quizTitle?: string | null;
  passingScore?: number | null;
}

export interface CourseContent extends Course {
  chapters: Chapter[];
}

export interface CourseApiResponse {
  id: string | number;
  slug?: string;
  title?: string;
  short_description?: string;
  shortDescription?: string;
  full_description?: string;
  fullDescription?: string;
  price_eur?: number;
  priceEur?: number;
  price_inr?: number;
  priceInr?: number;
  google_classroom_url?: string | null;
  googleClassroomUrl?: string | null;
  thumbnail_url?: string | null;
  thumbnailUrl?: string | null;
  is_published?: boolean;
  isPublished?: boolean;
  stripe_payment_link_eur?: string | null;
  stripePaymentLinkEur?: string | null;
  stripe_payment_link_inr?: string | null;
  stripePaymentLinkInr?: string | null;
  chapters?: ChapterApiResponse[];
}

export interface ChapterApiResponse {
  id: string | number;
  title?: string;
  description?: string | null;
  order_index?: number;
  orderIndex?: number;
  quiz_id?: string | null;
  quizId?: string | null;
  quiz_title?: string | null;
  quizTitle?: string | null;
  passing_score?: number | null;
  passingScore?: number | null;
  quiz?: {
    id?: string;
    title?: string;
    passing_score?: number | null;
  } | null;
  lessons?: LessonApiResponse[];
}

export interface LessonApiResponse {
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
  completed?: boolean;
}

export interface UpdateCoursePayload {
  title?: string;
  shortDescription?: string;
  fullDescription?: string;
  priceEur?: number;
  priceInr?: number;
  googleClassroomUrl?: string | null;
  thumbnailUrl?: string | null;
  isPublished?: boolean;
  stripePaymentLinkEur?: string | null;
  stripePaymentLinkInr?: string | null;
}

export interface ChapterPayload {
  title?: string;
  description?: string | null;
  orderIndex?: number;
}

const normalizeLesson = (lesson: LessonApiResponse): Lesson => ({
  id: String(lesson.id),
  title: lesson.title ?? '',
  description: lesson.description ?? null,
  videoUrl: lesson.video_url ?? lesson.videoUrl ?? null,
  colabNotebookUrl: lesson.colab_notebook_url ?? lesson.colabNotebookUrl ?? null,
  notesContent: lesson.notes_content ?? lesson.notesContent ?? null,
  orderIndex: lesson.order_index ?? lesson.orderIndex ?? 0,
  completed: lesson.completed,
});

const normalizeChapter = (chapter: ChapterApiResponse): Chapter => ({
  id: String(chapter.id),
  title: chapter.title ?? '',
  description: chapter.description ?? null,
  orderIndex: chapter.order_index ?? chapter.orderIndex ?? 0,
  lessons: (chapter.lessons ?? []).map(normalizeLesson),
  quizId: chapter.quiz_id ?? chapter.quizId ?? chapter.quiz?.id ?? null,
  quizTitle: chapter.quiz_title ?? chapter.quizTitle ?? chapter.quiz?.title ?? null,
  passingScore: chapter.passing_score ?? chapter.passingScore ?? chapter.quiz?.passing_score ?? null,
});

const normalizeCourse = (course: CourseApiResponse): Course => ({
  id: String(course.id),
  slug: course.slug ?? '',
  title: course.title ?? '',
  shortDescription: course.short_description ?? course.shortDescription ?? '',
  fullDescription: course.full_description ?? course.fullDescription ?? '',
  priceEur: course.price_eur ?? course.priceEur,
  priceInr: course.price_inr ?? course.priceInr,
  googleClassroomUrl: course.google_classroom_url ?? course.googleClassroomUrl ?? null,
  thumbnailUrl: course.thumbnail_url ?? course.thumbnailUrl ?? null,
  isPublished: course.is_published ?? course.isPublished ?? false,
  stripePaymentLinkEur: course.stripe_payment_link_eur ?? course.stripePaymentLinkEur ?? null,
  stripePaymentLinkInr: course.stripe_payment_link_inr ?? course.stripePaymentLinkInr ?? null,
});

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

export const fetchCourseBySlug = async (slug: string): Promise<CourseContent> => {
  const { data } = await client.get<CourseApiResponse | { course: CourseApiResponse; chapters?: ChapterApiResponse[] }>(
    `/api/courses/slug/${slug}`
  );

  const course = 'course' in data ? data.course : data;
  const chapters = 'chapters' in data ? data.chapters : course.chapters;

  return {
    ...normalizeCourse(course),
    chapters: (chapters ?? []).map(normalizeChapter),
  };
};

export const listCourses = async (): Promise<Course[]> => {
  const { data } = await client.get<{ courses?: CourseApiResponse[] } | CourseApiResponse[]>('/api/courses');
  const coursesArray = Array.isArray(data) ? data : data.courses ?? [];
  return coursesArray.map(normalizeCourse);
};

export const updateCourse = async (courseId: string, payload: UpdateCoursePayload): Promise<Course> => {
  const { data } = await client.put<CourseApiResponse>(`/api/courses/${courseId}`, buildCoursePayload(payload));
  return normalizeCourse(data);
};

export const createChapter = async (courseId: string, payload: ChapterPayload): Promise<Chapter> => {
  const { data } = await client.post<ChapterApiResponse>(`/api/courses/${courseId}/chapters`, buildChapterPayload(payload));
  return {
    ...normalizeChapter(data),
    lessons: data.lessons?.map(normalizeLesson) ?? [],
  };
};

export const updateChapter = async (chapterId: string, payload: ChapterPayload): Promise<Chapter> => {
  const { data } = await client.put<ChapterApiResponse>(`/api/chapters/${chapterId}`, buildChapterPayload(payload));
  return {
    ...normalizeChapter(data),
    lessons: data.lessons?.map(normalizeLesson) ?? [],
  };
};

export const deleteChapter = async (chapterId: string): Promise<void> => {
  await client.delete(`/api/chapters/${chapterId}`);
};

export const getCourseContent = async (courseId: string): Promise<Chapter[]> => {
  const { data } = await client.get<{ chapters?: ChapterApiResponse[] } | ChapterApiResponse[]>(
    `/api/courses/${courseId}/chapters`
  );
  const chapters = Array.isArray(data) ? data : data.chapters ?? [];
  return chapters.map(normalizeChapter);
};

export const fetchCourseAccess = async (
  courseId: string
): Promise<{ enrolled: boolean; allowedLessonIds: string[] }> => {
  const { data } = await client.get<{ enrolled?: boolean; allowed_lessons?: Array<string | number> }>(
    `/api/courses/${courseId}/access`
  );

  return {
    enrolled: data.enrolled ?? false,
    allowedLessonIds: (data.allowed_lessons ?? []).map(String),
  };
};

export { normalizeLesson as normalizeLessonFromApi, normalizeChapter as normalizeChapterFromApi, normalizeCourse as normalizeCourseFromApi };

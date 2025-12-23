import { client } from './client';
import {
  Chapter,
  Course,
  Lesson,
  ChapterApiResponse,
  CourseApiResponse,
  LessonApiResponse,
  normalizeChapterFromApi,
  normalizeCourseFromApi,
  normalizeLessonFromApi,
} from './courses';

export interface LearningContent {
  course: Course;
  chapters: Chapter[];
  enrolled: boolean;
}

export interface Quiz {
  id: string;
  title: string;
  passingScore: number;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  points: number;
}

export interface QuizResult {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string | null;
  isCorrect: boolean;
  points: number;
}

export interface Certificate {
  id: string;
  courseId: string;
  status: string;
  certificateNumber: string | null;
  issuedAt: string | null;
  createdAt: string;
  course?: {
    title: string;
    slug?: string;
  };
  profile?: {
    fullName?: string | null;
    email?: string | null;
  } | null;
}

export interface CourseCompletion {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  completedLessons: number;
  totalLessons: number;
  isComplete: boolean;
  hasCertificate: boolean;
}

interface LearningContentApiResponse {
  course?: unknown;
  chapters?: unknown[];
  enrolled?: boolean;
}

interface QuizQuestionApi {
  id: string | number;
  question_text?: string;
  questionText?: string;
  options?: string[] | string;
  points?: number;
}

interface QuizSubmissionResponse {
  results?: QuizResult[];
  score?: number;
  max_score?: number;
  maxScore?: number;
  percentage?: number;
}

interface CertificateApiResponse {
  id: string | number;
  course_id?: string | number;
  status?: string;
  certificate_number?: string | null;
  issued_at?: string | null;
  created_at?: string;
  course?: {
    title?: string;
    slug?: string;
  };
  profile?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
}

interface CompletionApiResponse {
  course_id?: string | number;
  course_title?: string;
  course_slug?: string;
  completed_lessons?: number;
  total_lessons?: number;
  is_complete?: boolean;
  has_certificate?: boolean;
}

export const fetchLearningContent = async (courseSlug: string): Promise<LearningContent> => {
  const { data } = await client.get<LearningContentApiResponse>(`/api/classwork/courses/${courseSlug}`);

  const chaptersFromApi = (data.chapters ?? []) as ChapterApiResponse[];
  const chapters = chaptersFromApi.map((chapter) =>
    normalizeChapterFromApi({
      ...chapter,
      lessons: (chapter.lessons ?? []).map((lesson: LessonApiResponse) =>
        normalizeLessonFromApi({
          ...lesson,
          completed: lesson.completed,
        })
      ),
    })
  );

  return {
    course: normalizeCourseFromApi((data.course ?? {}) as CourseApiResponse),
    chapters,
    enrolled: data.enrolled ?? true,
  };
};

export const markLessonComplete = async (lessonId: string): Promise<void> => {
  await client.post(`/api/classwork/lessons/${lessonId}/complete`);
};

export const fetchQuizQuestions = async (quizId: string): Promise<QuizQuestion[]> => {
  const { data } = await client.get<{ questions?: QuizQuestionApi[] } | QuizQuestionApi[]>(
    `/api/classwork/quizzes/${quizId}/questions`
  );
  const questions = Array.isArray(data) ? data : data.questions ?? [];

  return questions.map((question) => ({
    id: String(question.id),
    questionText: question.question_text ?? question.questionText ?? '',
    options: Array.isArray(question.options)
      ? question.options
      : typeof question.options === 'string'
        ? JSON.parse(question.options)
        : [],
    points: question.points ?? 1,
  }));
};

export const submitQuizAttempt = async (
  quizId: string,
  answers: Record<string, string>
): Promise<{ results: QuizResult[]; percentage: number; maxScore: number }> => {
  const { data } = await client.post<QuizSubmissionResponse>(`/api/classwork/quizzes/${quizId}/submit`, {
    answers,
  });

  const maxScore = data.max_score ?? data.maxScore ?? 0;
  const percentage = data.percentage ?? (data.score && maxScore ? (data.score / maxScore) * 100 : 0) ?? 0;

  return {
    results: data.results ?? [],
    percentage,
    maxScore,
  };
};

const normalizeCertificate = (cert: CertificateApiResponse): Certificate => ({
  id: String(cert.id),
  courseId: cert.course_id ? String(cert.course_id) : '',
  status: cert.status ?? 'pending',
  certificateNumber: cert.certificate_number ?? null,
  issuedAt: cert.issued_at ?? null,
  createdAt: cert.created_at ?? '',
  course: cert.course
    ? {
        title: cert.course.title ?? 'Unknown',
        slug: cert.course.slug,
      }
    : undefined,
  profile: cert.profile
    ? {
        fullName: cert.profile.full_name ?? null,
        email: cert.profile.email ?? null,
      }
    : null,
});

const normalizeCompletion = (completion: CompletionApiResponse): CourseCompletion => ({
  courseId: completion.course_id ? String(completion.course_id) : '',
  courseTitle: completion.course_title ?? '',
  courseSlug: completion.course_slug ?? '',
  completedLessons: completion.completed_lessons ?? 0,
  totalLessons: completion.total_lessons ?? 0,
  isComplete: completion.is_complete ?? false,
  hasCertificate: completion.has_certificate ?? false,
});

export const fetchCertificatesOverview = async (): Promise<{
  certificates: Certificate[];
  completions: CourseCompletion[];
}> => {
  const { data } = await client.get<{
    certificates?: CertificateApiResponse[];
    completions?: CompletionApiResponse[];
  }>('/api/classwork/certificates');

  return {
    certificates: (data.certificates ?? []).map(normalizeCertificate),
    completions: (data.completions ?? []).map(normalizeCompletion),
  };
};

export const fetchCertificateRequests = async (): Promise<Certificate[]> => {
  const { data } = await client.get<{ certificates?: CertificateApiResponse[] }>('/api/classwork/certificates/requests');
  return (data.certificates ?? []).map(normalizeCertificate);
};

export const requestCertificate = async (courseId: string): Promise<Certificate> => {
  const { data } = await client.post<CertificateApiResponse>('/api/classwork/certificates', {
    course_id: courseId,
  });
  return normalizeCertificate(data);
};

export const updateCertificateStatus = async (
  certificateId: string,
  status: 'approved' | 'rejected' | 'pending'
): Promise<void> => {
  await client.put(`/api/classwork/certificates/${certificateId}`, { status });
};

export const createAnnouncement = async (payload: {
  title: string;
  content: string;
  courseId?: string | null;
  isGlobal?: boolean;
}) => {
  await client.post('/api/classwork/announcements', {
    title: payload.title,
    content: payload.content,
    course_id: payload.courseId,
    is_global: payload.isGlobal ?? !payload.courseId,
  });
};

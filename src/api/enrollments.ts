import { client } from './client';
import { Course, CourseApiResponse, normalizeCourseFromApi } from './courses';

export type EnrollmentStatus = 'pending' | 'completed' | 'cancelled';

export interface Enrollment {
  id: string;
  courseId: string;
  enrolledAt: string;
  paymentStatus: EnrollmentStatus | string;
  paymentMethod?: string | null;
  course?: Course;
  studentName?: string | null;
  studentEmail?: string | null;
  completedLessons?: number;
  totalLessons?: number;
  progressPercent?: number;
}

interface EnrollmentApiResponse {
  id: string | number;
  course_id?: string | number;
  enrolled_at?: string;
  payment_status?: string;
  payment_method?: string | null;
  status?: string;
  course?: unknown;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
  profile?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
  completed_lessons?: number;
  total_lessons?: number;
  progress_percent?: number;
  progress?: {
    completed_lessons?: number;
    total_lessons?: number;
    percent?: number;
  } | null;
}

export interface EnrollmentPayload {
  courseId: string;
  paymentMethod?: string;
  email?: string;
}

const normalizeEnrollment = (enrollment: EnrollmentApiResponse): Enrollment => {
  const progressCompleted =
    enrollment.progress?.completed_lessons ?? enrollment.completed_lessons ?? enrollment.progress?.percent;
  const progressTotal = enrollment.progress?.total_lessons ?? enrollment.total_lessons;

  return {
    id: String(enrollment.id),
    courseId: enrollment.course_id ? String(enrollment.course_id) : '',
    enrolledAt: enrollment.enrolled_at ?? '',
    paymentStatus: enrollment.payment_status ?? enrollment.status ?? 'pending',
    paymentMethod: enrollment.payment_method,
    course: enrollment.course ? normalizeCourseFromApi(enrollment.course as CourseApiResponse) : undefined,
    studentName: enrollment.user?.name ?? enrollment.profile?.full_name ?? null,
    studentEmail: enrollment.user?.email ?? enrollment.profile?.email ?? null,
    completedLessons: typeof progressCompleted === 'number' ? progressCompleted : undefined,
    totalLessons: progressTotal,
    progressPercent: enrollment.progress?.percent ?? enrollment.progress_percent,
  };
};

export const fetchMyEnrollments = async (): Promise<Enrollment[]> => {
  const { data } = await client.get<{ enrollments?: EnrollmentApiResponse[] } | EnrollmentApiResponse[]>(
    '/api/enrollments/me'
  );
  const list = Array.isArray(data) ? data : data.enrollments ?? [];
  return list.map(normalizeEnrollment);
};

export const fetchEnrollments = async (): Promise<Enrollment[]> => {
  const { data } = await client.get<{ enrollments?: EnrollmentApiResponse[] } | EnrollmentApiResponse[]>(
    '/api/enrollments'
  );
  const list = Array.isArray(data) ? data : data.enrollments ?? [];
  return list.map(normalizeEnrollment);
};

export const createEnrollment = async (payload: EnrollmentPayload): Promise<Enrollment> => {
  const { data } = await client.post<EnrollmentApiResponse>('/api/enrollments', {
    course_id: payload.courseId,
    payment_method: payload.paymentMethod,
    email: payload.email,
  });
  return normalizeEnrollment(data);
};

export const updateEnrollmentStatus = async (enrollmentId: string, status: EnrollmentStatus): Promise<void> => {
  await client.put(`/api/enrollments/${enrollmentId}`, { payment_status: status });
};

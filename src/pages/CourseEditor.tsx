import AdminCourseEditor, { CourseEditorApi } from './AdminCourseEditor';
import {
  createInstructorChapter,
  createInstructorLesson,
  deleteInstructorChapter,
  deleteInstructorLesson,
  fetchInstructorCourseBySlug,
  updateInstructorChapter,
  updateInstructorCourse,
  updateInstructorLesson,
} from '@/api/instructor';
import { Chapter } from '@/api/courses';
import { LessonPayload } from '@/api/lessons';

const instructorCourseEditorApi: CourseEditorApi = {
  fetchCourseBySlug: fetchInstructorCourseBySlug,
  updateCourse: (courseId, payload) =>
    updateInstructorCourse(courseId, {
      title: payload.title,
      shortDescription: payload.shortDescription,
      fullDescription: payload.fullDescription,
      priceEur: payload.priceEur,
      priceInr: payload.priceInr,
      googleClassroomUrl: payload.googleClassroomUrl,
      thumbnailUrl: payload.thumbnailUrl,
      isPublished: payload.isPublished,
      stripePaymentLinkEur: payload.stripePaymentLinkEur,
      stripePaymentLinkInr: payload.stripePaymentLinkInr,
    }),
  createChapter: (courseId, payload: Partial<Chapter>) =>
    createInstructorChapter(courseId, {
      title: payload.title,
      description: payload.description,
      orderIndex: payload.orderIndex,
    }),
  updateChapter: (chapterId, payload: Partial<Chapter>) =>
    updateInstructorChapter(chapterId, {
      title: payload.title,
      description: payload.description,
      orderIndex: payload.orderIndex,
    }),
  deleteChapter: deleteInstructorChapter,
  createLesson: (chapterId, payload: LessonPayload) => createInstructorLesson(chapterId, payload),
  updateLesson: (lessonId, payload: LessonPayload) => updateInstructorLesson(lessonId, payload),
  deleteLesson: deleteInstructorLesson,
};

export default function CourseEditor() {
  return <AdminCourseEditor api={instructorCourseEditorApi} />;
}

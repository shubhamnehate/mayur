-- Add stripe_payment_link column to courses table
ALTER TABLE public.courses 
ADD COLUMN stripe_payment_link_eur TEXT,
ADD COLUMN stripe_payment_link_inr TEXT;

-- Add email column to profiles for easier admin lookup
ALTER TABLE public.profiles
ADD COLUMN email TEXT;

-- Add unique constraint on user_id + course_id for enrollments
ALTER TABLE public.enrollments 
ADD CONSTRAINT enrollments_user_course_unique UNIQUE (user_id, course_id);
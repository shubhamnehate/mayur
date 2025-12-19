-- Fix profiles table: Only authenticated users can view profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix quiz_questions: Create a view that hides correct answers for students
-- First, drop the permissive policy that exposes answers
DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;

-- Create policy: Students can only see questions (not answers) through a secure function
-- Admins and instructors can see everything
CREATE POLICY "Admins can view all quiz questions" 
ON public.quiz_questions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'instructor'::app_role));

-- Create a secure function for students to get quiz questions WITHOUT answers
CREATE OR REPLACE FUNCTION public.get_quiz_questions_for_student(p_quiz_id uuid)
RETURNS TABLE (
  id uuid,
  quiz_id uuid,
  question_text text,
  question_type text,
  options jsonb,
  points integer,
  order_index integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    qq.id,
    qq.quiz_id,
    qq.question_text,
    qq.question_type,
    qq.options,
    qq.points,
    qq.order_index
  FROM public.quiz_questions qq
  WHERE qq.quiz_id = p_quiz_id
  ORDER BY qq.order_index;
$$;

-- Create a secure function to check answers and return results
CREATE OR REPLACE FUNCTION public.check_quiz_answer(p_question_id uuid, p_answer text)
RETURNS TABLE (
  is_correct boolean,
  correct_answer text,
  explanation text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    qq.correct_answer = p_answer as is_correct,
    qq.correct_answer,
    qq.explanation
  FROM public.quiz_questions qq
  WHERE qq.id = p_question_id;
$$;
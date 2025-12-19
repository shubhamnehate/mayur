-- Add access expiration to enrollments
ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMP WITH TIME ZONE;

-- Create certificates table
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  certificate_number TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable RLS on certificates
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Users can view their own certificates
CREATE POLICY "Users can view own certificates"
ON public.certificates
FOR SELECT
USING (auth.uid() = user_id);

-- Users can request certificates
CREATE POLICY "Users can request certificates"
ON public.certificates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all certificates
CREATE POLICY "Admins can manage certificates"
ON public.certificates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Instructors can manage certificates
CREATE POLICY "Instructors can manage certificates"
ON public.certificates
FOR ALL
USING (has_role(auth.uid(), 'instructor'::app_role));

-- Function to generate certificate number
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.certificate_number := 'CERT-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    NEW.issued_at := NOW();
    NEW.approved_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for certificate number generation
CREATE TRIGGER generate_cert_number_trigger
BEFORE UPDATE ON public.certificates
FOR EACH ROW
EXECUTE FUNCTION public.generate_certificate_number();
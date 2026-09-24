-- FitTrack - schema base de dados
-- Limpar estrutura anterior se existir

DO $$ DECLARE r record;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', r.policyname, r.tablename);
  END LOOP;
END $$;

DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.personal_training_requests CASCADE;
DROP TABLE IF EXISTS public.instructor_availability CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;
DROP TABLE IF EXISTS public.equipment CASCADE;
DROP TABLE IF EXISTS public.studios CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.task_logs CASCADE;
DROP TABLE IF EXISTS public.task_templates CASCADE;
DROP TABLE IF EXISTS public.savings_entries CASCADE;
DROP TABLE IF EXISTS public.households CASCADE;

DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_household() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_enrolled_count() CASCADE;
DROP FUNCTION IF EXISTS public.sync_training_status() CASCADE;

-- tabelas principais

CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text, email text, phone text, birth_date date,
  role text NOT NULL DEFAULT 'membro' CHECK (role IN ('membro','instrutor','admin')),
  active boolean DEFAULT true, created_at timestamptz DEFAULT now()
);

CREATE TABLE public.studios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL, capacity integer DEFAULT 20, type text DEFAULT 'Geral',
  active boolean DEFAULT true, created_at timestamptz DEFAULT now()
);

CREATE TABLE public.classes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL, type text DEFAULT 'Yoga', description text,
  instructor_id uuid REFERENCES public.profiles(id),
  scheduled_at timestamptz NOT NULL, duration_min integer DEFAULT 60,
  max_capacity integer DEFAULT 15, enrolled_count integer DEFAULT 0,
  location text, studio_id uuid REFERENCES public.studios(id),
  status text DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','cancelled')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.enrollments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed','pending','cancelled')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(class_id, member_id)
);

CREATE TABLE public.instructor_availability (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  weekday integer NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time time NOT NULL, end_time time NOT NULL,
  is_recurring boolean DEFAULT true, specific_date date, notes text,
  created_at timestamptz DEFAULT now()
);

-- workflow de 3 passos para treino personalizado
CREATE TABLE public.personal_training_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid REFERENCES public.profiles(id),
  instructor_id uuid REFERENCES public.profiles(id),
  requested_at timestamptz NOT NULL,
  duration_min integer DEFAULT 60,
  format text DEFAULT 'Individual' CHECK (format IN ('Individual','Dueto','Trio')),
  objective text, notes text,
  status_instructor text DEFAULT 'pending' CHECK (status_instructor IN ('pending','accepted','rejected')),
  instructor_response_at timestamptz, instructor_notes text,
  status_admin text DEFAULT 'pending' CHECK (status_admin IN ('pending','validated','rejected')),
  admin_response_at timestamptz, admin_notes text,
  studio_id uuid REFERENCES public.studios(id),
  overall_status text DEFAULT 'aguarda_instrutor' CHECK (overall_status IN (
    'aguarda_instrutor','aguarda_admin','confirmado','rejeitado_instrutor','rejeitado_admin','cancelado')),
  confirmed_instructor boolean, confirmed_member boolean,
  conflict_resolved_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.equipment (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL, category text DEFAULT 'Cardio', quantity integer DEFAULT 1,
  condition text DEFAULT 'Bom' CHECK (condition IN ('Bom','Regular','Mau','Em manutenção')),
  location text, notes text, created_at timestamptz DEFAULT now()
);

-- funções e triggers

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, birth_date, role)
  VALUES (
    NEW.id, NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    (NEW.raw_user_meta_data->>'birth_date')::date,
    COALESCE(NEW.raw_user_meta_data->>'role','membro')
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_enrolled_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE public.classes SET enrolled_count = enrolled_count + 1 WHERE id = NEW.class_id;
  ELSIF TG_OP='DELETE' THEN
    UPDATE public.classes SET enrolled_count = GREATEST(enrolled_count - 1, 0) WHERE id = OLD.class_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_enrollment_change ON public.enrollments;
CREATE TRIGGER on_enrollment_change
  AFTER INSERT OR DELETE ON public.enrollments
  FOR EACH ROW EXECUTE PROCEDURE public.update_enrolled_count();

CREATE OR REPLACE FUNCTION public.sync_training_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status_instructor = 'rejected' THEN NEW.overall_status := 'rejeitado_instrutor';
  ELSIF NEW.status_instructor = 'accepted' AND NEW.status_admin = 'rejected' THEN NEW.overall_status := 'rejeitado_admin';
  ELSIF NEW.status_instructor = 'accepted' AND NEW.status_admin = 'validated' THEN NEW.overall_status := 'confirmado';
  ELSIF NEW.status_instructor = 'accepted' THEN NEW.overall_status := 'aguarda_admin';
  ELSE NEW.overall_status := 'aguarda_instrutor';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ptr_update ON public.personal_training_requests;
CREATE TRIGGER on_ptr_update
  BEFORE UPDATE ON public.personal_training_requests
  FOR EACH ROW EXECUTE PROCEDURE public.sync_training_status();

-- políticas de segurança (RLS)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_training_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_sel" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.get_my_role() IN ('admin','instrutor'));
CREATE POLICY "profiles_upd" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.get_my_role() = 'admin');

CREATE POLICY "studios_sel" ON public.studios FOR SELECT USING (true);
CREATE POLICY "studios_mod" ON public.studios FOR ALL USING (public.get_my_role() = 'admin');

CREATE POLICY "classes_sel" ON public.classes FOR SELECT USING (true);
CREATE POLICY "classes_ins" ON public.classes FOR INSERT WITH CHECK (public.get_my_role() IN ('instrutor','admin'));
CREATE POLICY "classes_upd" ON public.classes FOR UPDATE USING (instructor_id = auth.uid() OR public.get_my_role() = 'admin');
CREATE POLICY "classes_del" ON public.classes FOR DELETE USING (instructor_id = auth.uid() OR public.get_my_role() = 'admin');

CREATE POLICY "enroll_sel" ON public.enrollments FOR SELECT
  USING (member_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.instructor_id = auth.uid())
    OR public.get_my_role() = 'admin');
CREATE POLICY "enroll_ins" ON public.enrollments FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "enroll_del" ON public.enrollments FOR DELETE USING (member_id = auth.uid());

CREATE POLICY "avail_sel" ON public.instructor_availability FOR SELECT USING (true);
CREATE POLICY "avail_mod" ON public.instructor_availability FOR ALL
  USING (instructor_id = auth.uid() OR public.get_my_role() = 'admin');

CREATE POLICY "ptr_sel" ON public.personal_training_requests FOR SELECT
  USING (member_id = auth.uid() OR instructor_id = auth.uid() OR public.get_my_role() = 'admin');
CREATE POLICY "ptr_ins" ON public.personal_training_requests FOR INSERT WITH CHECK (member_id = auth.uid());
CREATE POLICY "ptr_upd" ON public.personal_training_requests FOR UPDATE
  USING (member_id = auth.uid() OR instructor_id = auth.uid() OR public.get_my_role() = 'admin');

CREATE POLICY "equip_sel" ON public.equipment FOR SELECT USING (true);
CREATE POLICY "equip_mod" ON public.equipment FOR ALL USING (public.get_my_role() = 'admin');

-- dados iniciais

INSERT INTO public.studios (name, capacity, type) VALUES
  ('Studio A', 20, 'Yoga/Pilates'),
  ('Studio B', 25, 'Spinning'),
  ('Studio C', 15, 'Pilates'),
  ('Gym Floor', 40, 'CrossFit'),
  ('Piscina', 12, 'Natação');

INSERT INTO public.equipment (name, category, quantity, condition, location) VALUES
  ('Bicicleta Spinning', 'Cardio', 20, 'Bom', 'Studio B'),
  ('Tapete Yoga', 'Yoga', 30, 'Bom', 'Studio A'),
  ('Halteres 5kg', 'Musculação', 20, 'Bom', 'Gym Floor'),
  ('Halteres 10kg', 'Musculação', 15, 'Bom', 'Gym Floor'),
  ('Barra Olímpica', 'Musculação', 8, 'Bom', 'Gym Floor'),
  ('Rolo Pilates', 'Pilates', 20, 'Bom', 'Studio C'),
  ('TRX', 'Funcional', 10, 'Regular', 'Gym Floor'),
  ('Corda de Saltar', 'Cardio', 25, 'Bom', 'Gym Floor');

-- criar perfis para contas de teste já existentes
INSERT INTO public.profiles (id, email, full_name, role, active)
SELECT id, email,
  CASE
    WHEN email = 'admin@fittrack.pt'     THEN 'Ana Oliveira'
    WHEN email = 'instrutor@fittrack.pt' THEN 'Pedro Costa'
    WHEN email = 'membro@fittrack.pt'    THEN 'Brenda Albuquerque'
    ELSE split_part(email, '@', 1)
  END,
  CASE
    WHEN email = 'admin@fittrack.pt'     THEN 'admin'
    WHEN email = 'instrutor@fittrack.pt' THEN 'instrutor'
    ELSE 'membro'
  END,
  true
FROM auth.users
WHERE email IN ('admin@fittrack.pt','instrutor@fittrack.pt','membro@fittrack.pt')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, active = true;

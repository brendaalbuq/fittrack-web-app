-- FitTrack - dados de demonstração
-- Executar depois do schema.sql e de criar os 3 utilizadores em Authentication

DO $$
DECLARE
  instrutor_id uuid;
  membro_id uuid;
  studio_c uuid;
  class1 uuid; class2 uuid; class3 uuid; class4 uuid;
BEGIN
  SELECT id INTO instrutor_id FROM auth.users WHERE email = 'instrutor@fittrack.pt' LIMIT 1;
  SELECT id INTO membro_id   FROM auth.users WHERE email = 'membro@fittrack.pt'    LIMIT 1;
  SELECT id INTO studio_c    FROM public.studios WHERE name = 'Studio C' LIMIT 1;

  IF instrutor_id IS NULL OR membro_id IS NULL THEN
    RAISE EXCEPTION 'Contas de teste não encontradas. Cria os utilizadores em Authentication primeiro.';
  END IF;

  -- limpar dados anteriores para poder re-executar
  DELETE FROM public.enrollments WHERE member_id = membro_id;
  DELETE FROM public.personal_training_requests WHERE member_id = membro_id OR instructor_id = instrutor_id;
  DELETE FROM public.instructor_availability WHERE instructor_id = instrutor_id;
  DELETE FROM public.classes WHERE instructor_id = instrutor_id;

  -- disponibilidade semanal do instrutor
  INSERT INTO public.instructor_availability (instructor_id, weekday, start_time, end_time, is_recurring, notes) VALUES
    (instrutor_id, 1, '09:00', '12:00', true, 'Yoga e Pilates'),
    (instrutor_id, 1, '17:00', '20:00', true, null),
    (instrutor_id, 2, '08:00', '11:00', true, null),
    (instrutor_id, 3, '09:00', '13:00', true, 'Manhãs livres'),
    (instrutor_id, 4, '17:00', '21:00', true, null),
    (instrutor_id, 5, '09:00', '12:00', true, null),
    (instrutor_id, 6, '09:00', '13:00', true, 'Sábado de manhã');

  -- aulas de grupo para as próximas semanas
  INSERT INTO public.classes (name, type, instructor_id, scheduled_at, duration_min, max_capacity, enrolled_count, location, status, description)
  VALUES ('Yoga Matinal','Yoga', instrutor_id, now()+interval'1 day'+interval'9 hours', 60,15,3,'Studio A','confirmed','Aula de yoga para começar o dia com energia')
  RETURNING id INTO class1;

  INSERT INTO public.classes (name, type, instructor_id, scheduled_at, duration_min, max_capacity, enrolled_count, location, status, description)
  VALUES ('Pilates Core','Pilates', instrutor_id, now()+interval'3 days'+interval'10 hours', 50,12,5,'Studio C','confirmed','Fortalece o core e melhora a postura')
  RETURNING id INTO class3;

  INSERT INTO public.classes (name, type, instructor_id, scheduled_at, duration_min, max_capacity, enrolled_count, location, status, description)
  VALUES ('Spinning Power','Spinning', instrutor_id, now()+interval'2 days'+interval'18 hours', 45,20,12,'Studio B','confirmed','Sessão intensa de spinning')
  RETURNING id INTO class2;

  INSERT INTO public.classes (name, type, instructor_id, scheduled_at, duration_min, max_capacity, enrolled_count, location, status, description)
  VALUES ('CrossFit Funcional','CrossFit', instrutor_id, now()+interval'5 days'+interval'7 hours', 60,16,8,'Gym Floor','confirmed','Treino funcional de alta intensidade')
  RETURNING id INTO class4;

  INSERT INTO public.classes (name, type, instructor_id, scheduled_at, duration_min, max_capacity, enrolled_count, location, status) VALUES
    ('Yoga Suave',         'Yoga',       instrutor_id, now()+interval'7 days'+interval'9 hours',  60,15,0,'Studio A','confirmed'),
    ('Spinning Express',   'Spinning',   instrutor_id, now()+interval'4 days'+interval'7 hours',  30,20,6,'Studio B','confirmed'),
    ('Musculação Avançada','Musculação', instrutor_id, now()+interval'6 days'+interval'11 hours', 90,10,2,'Gym Floor','confirmed');

  -- inscrever o membro em 2 aulas
  INSERT INTO public.enrollments (class_id, member_id, status) VALUES
    (class1, membro_id, 'confirmed'),
    (class3, membro_id, 'confirmed');

  -- pedido a aguardar resposta do instrutor
  INSERT INTO public.personal_training_requests
    (member_id, instructor_id, requested_at, duration_min, format, objective, status_instructor, status_admin, overall_status)
  VALUES (membro_id, instrutor_id, now()+interval'10 days'+interval'10 hours',
    60,'Individual','Melhorar técnica de agachamento e força nas pernas','pending','pending','aguarda_instrutor');

  -- pedido aceite pelo instrutor, aguarda validação da academia
  INSERT INTO public.personal_training_requests
    (member_id, instructor_id, requested_at, duration_min, format, objective, notes,
     status_instructor, instructor_response_at, instructor_notes, status_admin, overall_status)
  VALUES (membro_id, instrutor_id, now()+interval'8 days'+interval'14 hours',
    60,'Dueto','Treino de cardio para preparar uma corrida','A minha amiga Sofia também vai',
    'accepted', now(), 'Ótimo objetivo, vemo-nos lá.','pending','aguarda_admin');

  -- pedido já confirmado com estúdio atribuído
  INSERT INTO public.personal_training_requests
    (member_id, instructor_id, requested_at, duration_min, format, objective,
     status_instructor, instructor_response_at, instructor_notes,
     status_admin, admin_response_at, studio_id, overall_status)
  VALUES (membro_id, instrutor_id, now()+interval'3 days'+interval'11 hours',
    45,'Individual','Mobilidade e flexibilidade, tenho dores nas costas',
    'accepted', now()-interval'2 days', 'Treino adaptado para mobilidade.',
    'validated', now()-interval'1 day', studio_c, 'confirmado');

  RAISE NOTICE 'Dados de demonstração carregados com sucesso.';
END $$;

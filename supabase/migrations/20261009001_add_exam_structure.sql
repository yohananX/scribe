-- Add structure column to exams table for ordered blocks (instructions, sections, passages, questions)
-- This stores the structured extraction result as JSONB

alter table public.exams
add column if not exists structure jsonb not null default '[]'::jsonb;

create index if not exists idx_exams_structure on public.exams using gin (structure);

-- Backfill existing exams with a flat question-only structure
update public.exams
set structure = (
  select jsonb_agg(
    jsonb_build_object(
      'type', 'question',
      'id', q.id,
      'order', q."order",
      'questionText', q.text,
      'marks', q.marks,
      'options', q.options,
      'pageNumber', q.page_number
    )
    order by q."order"
  )
  from public.questions q
  where q.exam_id = exams.id
)
where structure = '[]'::jsonb;
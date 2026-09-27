-- Atomic exam save: replaces questions + title_block in one transaction.
-- Run this in the Supabase SQL Editor, then Stage 2 code will use it via rpc().
-- Falls back to differential save if the function is missing.

create or replace function public.save_exam_with_questions(
  p_exam_id uuid,
  p_title_block jsonb,
  p_questions jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_index int := 0;
  v_text text;
  v_marks int;
  v_options jsonb;
begin
  -- Only the owning teacher may save.
  if not exists (
    select 1 from public.exams
    where id = p_exam_id
      and teacher_id = (select auth.uid())
  ) then
    raise exception 'Not authorized to save this exam.' using errcode = '42501';
  end if;

  if jsonb_typeof(p_questions) != 'array' then
    raise exception 'Questions must be an array.' using errcode = '22023';
  end if;

  if jsonb_array_length(p_questions) > 200 then
    raise exception 'Too many questions (max 200).' using errcode = '22023';
  end if;

  delete from public.questions where exam_id = p_exam_id;

  for v_item in select * from jsonb_array_elements(p_questions)
  loop
    v_index := v_index + 1;
    v_text := nullif(trim(coalesce(v_item->>'text', '')), '');
    if v_text is null or char_length(v_text) > 4000 then
      raise exception 'Question % text is invalid.', v_index using errcode = '22023';
    end if;

    v_marks := nullif(v_item->>'marks', '')::int;
    if v_marks is not null and (v_marks < 0 or v_marks > 200) then
      raise exception 'Question % marks out of range.', v_index using errcode = '22023';
    end if;

    v_options := coalesce(v_item->'options', '[]'::jsonb);
    if jsonb_typeof(v_options) != 'array' or jsonb_array_length(v_options) > 8 then
      raise exception 'Question % options invalid.', v_index using errcode = '22023';
    end if;

    insert into public.questions (exam_id, text, marks, options, "order")
    values (p_exam_id, v_text, v_marks, v_options, v_index);
  end loop;

  update public.exams
  set title_block = coalesce(p_title_block, '{}'::jsonb),
      updated_at = now()
  where id = p_exam_id;
end;
$$;

revoke all on function public.save_exam_with_questions(uuid, jsonb, jsonb) from public;
grant execute on function public.save_exam_with_questions(uuid, jsonb, jsonb) to authenticated;

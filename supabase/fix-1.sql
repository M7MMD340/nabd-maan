-- إصلاح 1: رمز الشريك يتولد بدالة متوفرة في Supabase، والدوال الخاصة ما يشغلها إلا المسجّل دخول
create or replace function public.create_couple() returns text
language plpgsql security definer set search_path = public as $$
declare c uuid; k text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select couple_id into c from profiles where id = auth.uid();
  if c is not null then return (select code from couples where id = c); end if;
  loop
    k := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from couples where code = k);
  end loop;
  insert into couples (code, created_by) values (k, auth.uid()) returning id into c;
  update profiles set couple_id = c where id = auth.uid();
  return k;
end $$;

revoke execute on function public.create_couple(), public.join_couple(text), public.my_health_token(), public.my_couple() from anon, public;
grant execute on function public.my_couple(), public.create_couple(), public.join_couple(text), public.my_health_token() to authenticated;

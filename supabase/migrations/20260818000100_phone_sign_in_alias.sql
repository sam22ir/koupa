-- Keep legacy local forms compatible with the canonical Algerian representation.
update public.profiles
set phone = case
  when phone ~ '^0[567][0-9]{8}$' then '+213' || substring(phone from 2)
  when phone ~ '^213[567][0-9]{8}$' then '+' || phone
  else phone
end
where phone ~ '^0[567][0-9]{8}$'
   or phone ~ '^213[567][0-9]{8}$';

-- A phone alias must identify at most one account before the auth bridge resolves it.
create unique index if not exists profiles_phone_unique
  on public.profiles (phone);

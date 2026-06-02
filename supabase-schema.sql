create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.budget_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  budget_amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, month_start)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#0f6b58',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_month_id uuid references public.budget_months(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  category text not null default 'General',
  name text not null,
  tags text[] not null default '{}',
  amount numeric(12, 2) not null check (amount >= 0),
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.transactions add column if not exists tags text[] not null default '{}';
alter table public.transactions add column if not exists category text not null default 'General';

create table if not exists public.debit_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  category text not null default 'General',
  tags text[] not null default '{}',
  amount numeric(12, 2) not null check (amount >= 0),
  day_of_month integer not null check (day_of_month between 1 and 31),
  auto_add_monthly boolean not null default false,
  last_auto_added_month date,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.budget_months enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.debit_orders enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can manage their budget months" on public.budget_months;
create policy "Users can manage their budget months"
on public.budget_months for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their categories" on public.categories;
create policy "Users can manage their categories"
on public.categories for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their transactions" on public.transactions;
create policy "Users can manage their transactions"
on public.transactions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their debit orders" on public.debit_orders;
create policy "Users can manage their debit orders"
on public.debit_orders for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, color)
  values
    (new.id, 'Housing', '#0f6b58'),
    (new.id, 'Food', '#e7b45f'),
    (new.id, 'Transport', '#365f91'),
    (new.id, 'Utilities', '#7d5a50'),
    (new.id, 'Lifestyle', '#9b3d27'),
    (new.id, 'Financial', '#365f91'),
    (new.id, 'Health', '#8b5cf6'),
    (new.id, 'Education', '#2563eb'),
    (new.id, 'Shopping', '#d97706'),
    (new.id, 'Savings', '#16a34a'),
    (new.id, 'General', '#697284')
  on conflict (user_id, name) do nothing;

  insert into public.budget_months (user_id, month_start, budget_amount)
  values (new.id, date_trunc('month', now())::date, 18500)
  on conflict (user_id, month_start) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

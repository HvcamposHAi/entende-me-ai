-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create enum for user roles
create type public.app_role as enum ('admin', 'user');

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  company text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Create user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Create user_access table for temporal access control
create table public.user_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  access_granted_at timestamptz not null default now(),
  access_expires_at timestamptz not null,
  is_active boolean not null default true,
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_access enable row level security;

-- Create usage_tracking table
create table public.usage_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  event_type text not null,
  page_path text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_usage_tracking_user_id on public.usage_tracking(user_id);
create index idx_usage_tracking_created_at on public.usage_tracking(created_at desc);

alter table public.usage_tracking enable row level security;

-- Create function to check if user has a specific role (SECURITY DEFINER to avoid RLS recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Create function to check if user has active access
create or replace function public.has_active_access(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_access
    where user_id = _user_id
      and is_active = true
      and access_expires_at > now()
  )
$$;

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert profile
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign default 'user' role
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  -- Grant 5-day access by default
  insert into public.user_access (user_id, access_expires_at)
  values (new.id, now() + interval '5 days');
  
  return new;
end;
$$;

-- Create trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create triggers for updated_at
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_user_access_updated_at
  before update on public.user_access
  for each row execute function public.handle_updated_at();

-- RLS Policies for profiles
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
create policy "Users can view their own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy "Admins can view all roles"
  on public.user_roles for select
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage all roles"
  on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_access
create policy "Users can view their own access"
  on public.user_access for select
  using (auth.uid() = user_id);

create policy "Admins can view all access"
  on public.user_access for select
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage all access"
  on public.user_access for all
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for usage_tracking
create policy "Users can insert their own tracking events"
  on public.usage_tracking for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own tracking"
  on public.usage_tracking for select
  using (auth.uid() = user_id);

create policy "Admins can view all tracking"
  on public.usage_tracking for select
  using (public.has_role(auth.uid(), 'admin'));
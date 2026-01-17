
-- Create users table
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  role text not null,
  avatar text,
  status text default 'pending',
  password text,
  token text
);

-- Create meetings table
create table if not exists meetings (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  date text not null,
  time text not null,
  host text not null,
  "participantsCount" integer default 0,
  status text default 'upcoming'
);

-- Create participants table
create table if not exists participants (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references meetings(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  name text not null,
  avatar text,
  role text,
  status text default 'admitted' -- New column for waiting room ('waiting' | 'admitted')
);

-- Create meeting_invites table
create table if not exists meeting_invites (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references meetings(id) on delete cascade,
  user_id uuid references users(id) on delete cascade
);

-- Create app_settings table
create table if not exists app_settings (
  id integer primary key,
  title text,
  icon_url text,
  google_drive_client_id text,
  google_drive_api_key text
);

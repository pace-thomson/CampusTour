# Supasbase Table Schemas

## **locations**
```sql
create table public.locations (
  id uuid not null default gen_random_uuid (),
  school_id uuid null,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  description text null,
  interests text[] null,
  default_stop boolean null default true,
  order_index integer null,
  created_at timestamp with time zone null default now(),
  careers text[] null,
  talking_points text[] null,
  features text[] null,
  constraint locations_pkey primary key (id),
  constraint locations_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE
) TABLESPACE pg_default;
```

## **schools**
```sql
create table public.schools (
  id uuid not null default gen_random_uuid (),
  name text not null,
  city text null,
  state text null,
  created_at timestamp with time zone null default now(),
  coordinates jsonb null,
  primary_color text null default '#990000'::text,
  logo_url text null,
  degrees_offered text[] null,
  constraint schools_pkey primary key (id)
) TABLESPACE pg_default;
```

## **analytics_events**
```sql
create table public.analytics_events (
  id uuid not null default gen_random_uuid (),
  event_type text not null,
  timestamp timestamp with time zone not null default now(),
  session_id text not null,
  school_id uuid not null,
  location_id uuid null,
  metadata jsonb null,
  constraint analytics_events_pkey primary key (id),
  constraint analytics_events_location_id_fkey foreign KEY (location_id) references locations (id),
  constraint analytics_events_school_id_fkey foreign KEY (school_id) references schools (id)
) TABLESPACE pg_default;
```

## **leads**
```sql
create table public.leads (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null,
  school_id uuid not null,
  name text not null,
  identity text not null default ''::text,
  address text not null,
  email text not null,
  date_of_birth date null,
  gender text null,
  grad_year smallint null,
  constraint leads_pkey primary key (id),
  constraint leads_school_id_fkey foreign KEY (school_id) references schools (id)
) TABLESPACE pg_default;
```

## **location_media**
```sql
create table public.location_media (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  location_id uuid not null,
  stored_in_supabase boolean not null,
  media_type text not null,
  url text not null,
  constraint location_media_pkey primary key (id),
  constraint location_media_location_id_fkey foreign KEY (location_id) references locations (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;
```

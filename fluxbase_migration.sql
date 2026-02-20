-- ==========================================
-- Gymtrack Fluxbase Migration Schema (With Foreign Keys)
-- Run these queries in your Fluxbase SQL Editor
-- ==========================================

-- 1. System Tables (Global)
-- ------------------------------------------

CREATE TABLE gyms (
    id VARCHAR PRIMARY KEY,
    name VARCHAR,
    owner_email VARCHAR,
    owner_user_id VARCHAR,
    formatted_gym_id VARCHAR UNIQUE,
    status VARCHAR,
    created_at TIMESTAMP,
    payment_id VARCHAR,
    app_email VARCHAR,
    app_pass VARCHAR,
    app_host VARCHAR,
    from_email VARCHAR,
    port VARCHAR,
    session_time_hours INT,
    max_capacity INT
);

CREATE TABLE super_admins (
    id VARCHAR PRIMARY KEY,
    email VARCHAR UNIQUE,
    password_hash VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    smtp_username VARCHAR,
    smtp_pass VARCHAR,
    smtp_host VARCHAR,
    smtp_from VARCHAR,
    smtp_port VARCHAR
);

CREATE TABLE gym_requests (
    id VARCHAR PRIMARY KEY,
    gym_name VARCHAR,
    owner_name VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    city VARCHAR,
    status VARCHAR,
    created_at TIMESTAMP
);

-- 2. Tenant Tables (Per Gym Data)
-- ------------------------------------------

CREATE TABLE plans (
    id VARCHAR PRIMARY KEY,
    gym_id VARCHAR REFERENCES gyms(id),
    plan_id VARCHAR,
    plan_name VARCHAR,
    price FLOAT,
    duration_months INT,
    is_active BOOLEAN
);

CREATE TABLE members (
    id VARCHAR PRIMARY KEY,
    gym_id VARCHAR REFERENCES gyms(id),
    plan_id VARCHAR REFERENCES plans(id),
    member_id VARCHAR,
    name VARCHAR,
    email VARCHAR,
    membership_status VARCHAR,
    membership_type VARCHAR,
    age INT,
    phone_number VARCHAR,
    join_date TIMESTAMP,
    expiry_date TIMESTAMP,
    created_at TIMESTAMP,
    profile_url VARCHAR
);

CREATE TABLE check_ins (
    id VARCHAR PRIMARY KEY,
    gym_id VARCHAR REFERENCES gyms(id),
    member_table_id VARCHAR REFERENCES members(id),
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    created_at TIMESTAMP
);

CREATE TABLE announcements (
    id VARCHAR PRIMARY KEY,
    gym_id VARCHAR REFERENCES gyms(id),
    formatted_gym_id VARCHAR,
    title VARCHAR,
    content VARCHAR,
    created_at TIMESTAMP
);

CREATE TABLE messages (
    id VARCHAR PRIMARY KEY,
    gym_id VARCHAR REFERENCES gyms(id),
    formatted_gym_id VARCHAR,
    sender_id VARCHAR,
    receiver_id VARCHAR,
    sender_type VARCHAR,
    receiver_type VARCHAR,
    content VARCHAR,
    created_at TIMESTAMP,
    read_at TIMESTAMP
);

-- 3. Workout & Logs Tables
-- ------------------------------------------

CREATE TABLE workouts (
    id VARCHAR PRIMARY KEY,
    member_id VARCHAR REFERENCES members(id),
    date TIMESTAMP,
    notes VARCHAR,
    created_at TIMESTAMP
);

CREATE TABLE workout_exercises (
    id VARCHAR PRIMARY KEY,
    workout_id VARCHAR REFERENCES workouts(id),
    name VARCHAR,
    sets VARCHAR,
    reps VARCHAR,
    weight FLOAT,
    created_at TIMESTAMP
);

CREATE TABLE body_weight_logs (
    id VARCHAR PRIMARY KEY,
    member_id VARCHAR REFERENCES members(id),
    date TIMESTAMP,
    weight FLOAT,
    created_at TIMESTAMP
);

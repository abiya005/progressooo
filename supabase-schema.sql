-- Progresso Database Schema for Supabase
-- Run this script in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'faculty', 'admin')),
    student_id VARCHAR(20) NULL,
    faculty_id VARCHAR(20) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'cancelled')),
    marks INTEGER CHECK (marks >= 0 AND marks <= 10),
    feedback TEXT,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    evaluated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_faculty_id ON users(faculty_id);
CREATE INDEX IF NOT EXISTS idx_projects_student_id ON projects(student_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_subtasks_project_id ON subtasks(project_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON subtasks(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subtasks_updated_at BEFORE UPDATE ON subtasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO users (username, email, password, role, student_id, faculty_id) VALUES
('john_doe', 'john.doe@example.com', '$2a$10$example_hash_1', 'student', 'STU001', NULL),
('jane_smith', 'jane.smith@example.com', '$2a$10$example_hash_2', 'student', 'STU002', NULL),
('prof_wilson', 'prof.wilson@university.edu', '$2a$10$example_hash_3', 'faculty', NULL, 'FAC001'),
('dr_brown', 'dr.brown@university.edu', '$2a$10$example_hash_4', 'faculty', NULL, 'FAC002')
ON CONFLICT (username) DO NOTHING;

-- Get the user IDs for sample data
DO $$
DECLARE
    john_id UUID;
    jane_id UUID;
    prof_wilson_id UUID;
    dr_brown_id UUID;
BEGIN
    SELECT id INTO john_id FROM users WHERE username = 'john_doe';
    SELECT id INTO jane_id FROM users WHERE username = 'jane_smith';
    SELECT id INTO prof_wilson_id FROM users WHERE username = 'prof_wilson';
    SELECT id INTO dr_brown_id FROM users WHERE username = 'dr_brown';

    -- Insert sample projects
    INSERT INTO projects (student_id, title, description, due_date, status) VALUES
    (john_id, 'E-Commerce Website', 'A full-stack e-commerce platform with React and Node.js', '2024-03-15', 'active'),
    (john_id, 'Mobile Banking App', 'Cross-platform mobile app for banking services', '2024-04-20', 'active'),
    (jane_id, 'AI Chatbot System', 'Intelligent chatbot using machine learning', '2024-03-30', 'active'),
    (jane_id, 'IoT Home Automation', 'Smart home system with IoT sensors', '2024-05-10', 'active')
    ON CONFLICT DO NOTHING;

    -- Get project IDs for sample subtasks
    DECLARE
        project1_id UUID;
        project2_id UUID;
        project3_id UUID;
        project4_id UUID;
    BEGIN
        SELECT id INTO project1_id FROM projects WHERE title = 'E-Commerce Website' AND student_id = john_id;
        SELECT id INTO project2_id FROM projects WHERE title = 'Mobile Banking App' AND student_id = john_id;
        SELECT id INTO project3_id FROM projects WHERE title = 'AI Chatbot System' AND student_id = jane_id;
        SELECT id INTO project4_id FROM projects WHERE title = 'IoT Home Automation' AND student_id = jane_id;

        -- Insert sample subtasks
        INSERT INTO subtasks (project_id, title, description, status, marks, feedback, due_date) VALUES
        (project1_id, 'Database Design', 'Design and implement the database schema', 'completed', 8, 'Good database structure, consider adding indexes', '2024-02-15'),
        (project1_id, 'Frontend Development', 'Create React components for product listing', 'in-progress', NULL, NULL, '2024-02-28'),
        (project1_id, 'Payment Integration', 'Integrate Stripe payment gateway', 'pending', NULL, NULL, '2024-03-10'),
        (project2_id, 'User Authentication', 'Implement secure login and registration', 'completed', 9, 'Excellent security implementation', '2024-02-20'),
        (project2_id, 'Account Dashboard', 'Create user account management interface', 'pending', NULL, NULL, '2024-03-05'),
        (project3_id, 'NLP Model Training', 'Train the chatbot with conversation data', 'completed', 7, 'Good model performance, needs more training data', '2024-02-25'),
        (project3_id, 'API Integration', 'Connect chatbot to external APIs', 'in-progress', NULL, NULL, '2024-03-15'),
        (project4_id, 'Sensor Integration', 'Connect and configure IoT sensors', 'pending', NULL, NULL, '2024-03-20'),
        (project4_id, 'Mobile App Interface', 'Create mobile app for controlling devices', 'pending', NULL, NULL, '2024-04-05')
        ON CONFLICT DO NOTHING;
    END;
END $$;

-- Create views for easier querying
CREATE OR REPLACE VIEW student_projects_view AS
SELECT 
    p.id,
    p.title,
    p.description,
    p.status,
    p.due_date,
    p.created_at,
    u.username as student_name,
    u.student_id,
    COUNT(s.id) as total_subtasks,
    COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_subtasks,
    ROUND(
        CASE 
            WHEN COUNT(s.id) > 0 THEN 
                (COUNT(CASE WHEN s.status = 'completed' THEN 1 END)::NUMERIC / COUNT(s.id)) * 100 
            ELSE 0 
        END::NUMERIC, 2
    ) as progress_percentage
FROM projects p
JOIN users u ON p.student_id = u.id
LEFT JOIN subtasks s ON p.id = s.project_id
GROUP BY p.id, p.title, p.description, p.status, p.due_date, p.created_at, u.username, u.student_id;

CREATE OR REPLACE VIEW faculty_evaluation_view AS
SELECT 
    s.id as subtask_id,
    s.title as subtask_title,
    s.description as subtask_description,
    s.status,
    s.marks,
    s.feedback,
    s.due_date,
    s.created_at,
    s.evaluated_at,
    p.title as project_title,
    u.username as student_name,
    u.student_id
FROM subtasks s
JOIN projects p ON s.project_id = p.id
JOIN users u ON p.student_id = u.id
ORDER BY s.created_at DESC;

-- Grant necessary permissions (adjust based on your Supabase setup)
-- These are typically handled automatically by Supabase, but you can add custom permissions here if needed

-- Create a function to get student progress summary
CREATE OR REPLACE FUNCTION get_student_progress(student_uuid UUID)
RETURNS TABLE (
    total_projects INTEGER,
    active_projects INTEGER,
    completed_subtasks INTEGER,
    total_subtasks INTEGER,
    average_marks NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT p.id)::INTEGER as total_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END)::INTEGER as active_projects,
        COUNT(CASE WHEN s.status = 'completed' THEN 1 END)::INTEGER as completed_subtasks,
        COUNT(s.id)::INTEGER as total_subtasks,
        ROUND(AVG(s.marks)::NUMERIC, 2) as average_marks
    FROM projects p
    LEFT JOIN subtasks s ON p.id = s.project_id
    WHERE p.student_id = student_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get faculty dashboard summary
CREATE OR REPLACE FUNCTION get_faculty_summary()
RETURNS TABLE (
    total_students INTEGER,
    total_projects INTEGER,
    pending_evaluations INTEGER,
    completed_evaluations INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT u.id)::INTEGER as total_students,
        COUNT(DISTINCT p.id)::INTEGER as total_projects,
        COUNT(CASE WHEN s.marks IS NULL THEN 1 END)::INTEGER as pending_evaluations,
        COUNT(CASE WHEN s.marks IS NOT NULL THEN 1 END)::INTEGER as completed_evaluations
    FROM users u
    LEFT JOIN projects p ON u.id = p.student_id
    LEFT JOIN subtasks s ON p.id = s.project_id
    WHERE u.role = 'student';
END;
$$ LANGUAGE plpgsql;

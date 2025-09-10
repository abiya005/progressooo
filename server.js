const express = require("express");
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// ✅ Connect to Supabase Database
const supabaseUrl = 'https://nkaafhuafausmcvzeanw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rYWFmaHVhZmF1c21jdnplYW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjU1MDEsImV4cCI6MjA3MzEwMTUwMX0.KMW3hYzQIR1kzrnUoj5eftBO2x8tTaOjUnMkycfOCqE';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("✅ Connected to Supabase Database");

// ✅ Signup Route
app.post("/signup", async (req, res) => {
    const { username, email, password, role, studentId, facultyId } = req.body;

    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user data into Supabase
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    username: username,
                    email: email,
                    password: hashedPassword,
                    role: role || 'student',
                    student_id: studentId || null,
                    faculty_id: facultyId || null
                }
            ]);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ message: "Error registering user", error: error.message });
        }

        res.json({ message: "User registered successfully", data });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ message: "Error registering user", error: err.message });
    }
});

// ✅ Login Route
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !data) {
            console.error('User not found:', error);
            return res.status(401).json({ message: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, data.password);
        if (!isPasswordValid) {
            console.error('Invalid password for user:', username);
            return res.status(401).json({ message: "Invalid password" });
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = data;
        console.log('Login successful for user:', username, 'Role:', userWithoutPassword.role);
        res.json({ message: "Login successful", user: userWithoutPassword });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ message: "Error during login", error: err.message });
    }
});

// ✅ Get all students
app.get("/api/students", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'student');

        if (error) {
            return res.status(500).send("Error fetching students");
        }

        res.json(data);
    } catch (err) {
        res.status(500).send("Error fetching students");
    }
});

// ✅ Get all faculty
app.get("/api/faculty", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'faculty');

        if (error) {
            return res.status(500).send("Error fetching faculty");
        }

        res.json(data);
    } catch (err) {
        res.status(500).send("Error fetching faculty");
    }
});

// ✅ Get projects for a student
app.get("/api/student/:studentId/projects", async (req, res) => {
    try {
        const { studentId } = req.params;
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('student_id', studentId);

        if (error) {
            return res.status(500).send("Error fetching projects");
        }

        res.json(data);
    } catch (err) {
        res.status(500).send("Error fetching projects");
    }
});

// ✅ Get all projects (for faculty)
app.get("/api/projects", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                users!projects_student_id_fkey(username, student_id)
            `);

        if (error) {
            return res.status(500).send("Error fetching projects");
        }

        res.json(data);
    } catch (err) {
        res.status(500).send("Error fetching projects");
    }
});

// ✅ Get subtasks for a project
app.get("/api/project/:projectId/subtasks", async (req, res) => {
    try {
        const { projectId } = req.params;
        const { data, error } = await supabase
            .from('subtasks')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).send("Error fetching subtasks");
        }

        res.json(data);
    } catch (err) {
        res.status(500).send("Error fetching subtasks");
    }
});

// ✅ Add subtask (student)
app.post("/api/subtask", async (req, res) => {
    try {
        const { project_id, title, description, due_date } = req.body;
        
        const { data, error } = await supabase
            .from('subtasks')
            .insert([
                {
                    project_id,
                    title,
                    description,
                    due_date,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }
            ])
            .select();

        if (error) {
            return res.status(500).send("Error adding subtask");
        }

        res.json({ message: "Subtask added successfully", data: data[0] });
    } catch (err) {
        res.status(500).send("Error adding subtask");
    }
});

// ✅ Update subtask marks and feedback (faculty)
app.put("/api/subtask/:subtaskId/evaluate", async (req, res) => {
    try {
        const { subtaskId } = req.params;
        const { marks, feedback, status } = req.body;
        
        const { data, error } = await supabase
            .from('subtasks')
            .update({
                marks: marks,
                feedback: feedback,
                status: status,
                evaluated_at: new Date().toISOString()
            })
            .eq('id', subtaskId)
            .select();

        if (error) {
            return res.status(500).send("Error updating subtask");
        }

        res.json({ message: "Subtask evaluated successfully", data: data[0] });
    } catch (err) {
        res.status(500).send("Error updating subtask");
    }
});

// ✅ Create project
app.post("/api/project", async (req, res) => {
    try {
        const { student_id, title, description, due_date } = req.body;
        
        const { data, error } = await supabase
            .from('projects')
            .insert([
                {
                    student_id,
                    title,
                    description,
                    due_date,
                    status: 'active',
                    created_at: new Date().toISOString()
                }
            ])
            .select();

        if (error) {
            return res.status(500).json({ message: "Error creating project", error: error.message });
        }

        res.json({ message: "Project created successfully", data: data[0] });
    } catch (err) {
        res.status(500).json({ message: "Error creating project", error: err.message });
    }
});

// ✅ Assign project to student (faculty only)
app.post("/api/assign-project", async (req, res) => {
    try {
        const { student_id, title, description, due_date, faculty_id } = req.body;
        
        // Verify faculty exists
        const { data: faculty, error: facultyError } = await supabase
            .from('users')
            .select('id')
            .eq('id', faculty_id)
            .eq('role', 'faculty')
            .single();

        if (facultyError || !faculty) {
            return res.status(403).json({ message: "Invalid faculty ID" });
        }

        // Verify student exists
        const { data: student, error: studentError } = await supabase
            .from('users')
            .select('id, username')
            .eq('id', student_id)
            .eq('role', 'student')
            .single();

        if (studentError || !student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Create project
        const { data, error } = await supabase
            .from('projects')
            .insert([
                {
                    student_id,
                    title,
                    description,
                    due_date,
                    status: 'active',
                    created_at: new Date().toISOString()
                }
            ])
            .select();

        if (error) {
            return res.status(500).json({ message: "Error assigning project", error: error.message });
        }

        res.json({ 
            message: `Project assigned to ${student.username} successfully`, 
            data: data[0] 
        });
    } catch (err) {
        res.status(500).json({ message: "Error assigning project", error: err.message });
    }
});

// ✅ Update project status
app.put("/api/project/:projectId/status", async (req, res) => {
    try {
        const { projectId } = req.params;
        const { status } = req.body;
        
        const { data, error } = await supabase
            .from('projects')
            .update({ 
                status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', projectId)
            .select();

        if (error) {
            return res.status(500).json({ message: "Error updating project status", error: error.message });
        }

        res.json({ message: "Project status updated successfully", data: data[0] });
    } catch (err) {
        res.status(500).json({ message: "Error updating project status", error: err.message });
    }
});

// ✅ Get project progress summary
app.get("/api/project/:projectId/progress", async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const { data, error } = await supabase
            .from('subtasks')
            .select('*')
            .eq('project_id', projectId);

        if (error) {
            return res.status(500).json({ message: "Error fetching progress", error: error.message });
        }

        const totalSubtasks = data.length;
        const completedSubtasks = data.filter(s => s.status === 'completed').length;
        const progressPercentage = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
        const averageMarks = data.filter(s => s.marks !== null).reduce((sum, s) => sum + s.marks, 0) / data.filter(s => s.marks !== null).length || 0;

        res.json({
            totalSubtasks,
            completedSubtasks,
            progressPercentage,
            averageMarks: Math.round(averageMarks * 100) / 100,
            subtasks: data
        });
    } catch (err) {
        res.status(500).json({ message: "Error fetching progress", error: err.message });
    }
});

// Start Server
app.listen(5000, () => {
    console.log("🚀 Server running on http://localhost:5000");
});

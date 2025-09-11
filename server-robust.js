const express = require("express");
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cors = require("cors");
const config = require('./config');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// ✅ Connect to Supabase Database
let supabase = null;
let dbConnected = false;

// Initialize Supabase connection
async function initializeSupabase() {
    try {
        supabase = createClient(config.supabase.url, config.supabase.anonKey);
        
        // Test connection
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);
            
        if (!error) {
            dbConnected = true;
            console.log("✅ Connected to Supabase Database successfully!");
            console.log(`📊 Database URL: ${config.supabase.url}`);
        } else {
            console.log("⚠️  Supabase connection failed:", error.message);
            if (error.message.includes('relation "users" does not exist')) {
                console.log("📊 Database Schema Issue: Users table doesn't exist");
                console.log("💡 Run the supabase-schema.sql script in your Supabase dashboard");
            }
            dbConnected = false;
        }
    } catch (err) {
        console.log("⚠️  Supabase connection failed:", err.message);
        dbConnected = false;
    }
}

// Initialize connection
initializeSupabase();

// Mock data for fallback
let mockUsers = [
    {
        id: "1",
        username: "john_doe",
        email: "john.doe@example.com",
        password: "$2b$12$pr0iXv8nrJs.hy.VIBupNOQNqHAwrCNiisYInIzBDo.n6LaP1ceb6", // password123
        role: "student",
        student_id: "STU001"
    },
    {
        id: "2", 
        username: "jane_smith",
        email: "jane.smith@example.com",
        password: "$2b$12$pr0iXv8nrJs.hy.VIBupNOQNqHAwrCNiisYInIzBDo.n6LaP1ceb6", // password123
        role: "student",
        student_id: "STU002"
    },
    {
        id: "3",
        username: "prof_wilson",
        email: "prof.wilson@university.edu",
        password: "$2b$12$pr0iXv8nrJs.hy.VIBupNOQNqHAwrCNiisYInIzBDo.n6LaP1ceb6", // password123
        role: "faculty",
        faculty_id: "FAC001"
    }
];

let mockProjects = [
    {
        id: "1",
        student_id: "1",
        title: "E-Commerce Website",
        description: "A full-stack e-commerce platform with React and Node.js",
        status: "active",
        due_date: "2024-03-15",
        created_at: "2024-01-15T10:00:00Z"
    },
    {
        id: "2",
        student_id: "2", 
        title: "AI Chatbot System",
        description: "Intelligent chatbot using machine learning",
        status: "active",
        due_date: "2024-03-30",
        created_at: "2024-01-20T10:00:00Z"
    }
];

let mockSubtasks = [
    {
        id: "1",
        project_id: "1",
        title: "Database Design",
        description: "Design and implement the database schema",
        status: "completed",
        marks: 8,
        feedback: "Good database structure, consider adding indexes",
        due_date: "2024-02-15",
        created_at: "2024-01-15T10:00:00Z",
        evaluated_at: "2024-02-16T10:00:00Z"
    },
    {
        id: "2",
        project_id: "1",
        title: "Frontend Development",
        description: "Create React components for product listing",
        status: "in-progress",
        marks: null,
        feedback: null,
        due_date: "2024-02-28",
        created_at: "2024-01-20T10:00:00Z"
    }
];

// Helper function to get users
async function getUsers(role = null) {
    if (dbConnected && supabase) {
        try {
            let query = supabase.from('users').select('*');
            if (role) {
                query = query.eq('role', role);
            }
            const { data, error } = await query;
            if (!error) return data;
        } catch (err) {
            console.log('Database error, using mock data');
        }
    }
    
    // Fallback to mock data
    return role ? mockUsers.filter(u => u.role === role) : mockUsers;
}

// Helper function to find user by username
async function findUserByUsername(username) {
    if (dbConnected && supabase) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .single();
            if (!error && data) return data;
        } catch (err) {
            console.log('Database error, using mock data');
        }
    }
    
    // Fallback to mock data
    return mockUsers.find(u => u.username === username);
}

// Helper function to create user
async function createUser(userData) {
    if (dbConnected && supabase) {
        try {
            const { data, error } = await supabase
                .from('users')
                .insert([userData])
                .select('id, username, email, role, student_id, faculty_id, created_at');
            if (!error) return data[0];
        } catch (err) {
            console.log('Database error, using mock data');
        }
    }
    
    // Fallback to mock data
    const newUser = {
        id: (mockUsers.length + 1).toString(),
        ...userData
    };
    mockUsers.push(newUser);
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
}

// ✅ Signup Route
app.post("/signup", async (req, res) => {
    const { username, email, password, role, studentId, facultyId } = req.body;

    // Input validation
    if (!username || !email || !password) {
        return res.status(400).json({ 
            message: "Missing required fields: username, email, and password are required" 
        });
    }

    if (password.length < 6) {
        return res.status(400).json({ 
            message: "Password must be at least 6 characters long" 
        });
    }

    if (!['student', 'faculty'].includes(role)) {
        return res.status(400).json({ 
            message: "Invalid role. Must be 'student' or 'faculty'" 
        });
    }

    try {
        // Check if user already exists
        const existingUser = await findUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ message: "Username already exists" });
        }

        // Check email in mock data if not using database
        if (!dbConnected) {
            const existingEmail = mockUsers.find(u => u.email === email);
            if (existingEmail) {
                return res.status(409).json({ message: "Email already exists" });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const userData = {
            username: username,
            email: email,
            password: hashedPassword,
            role: role || 'student',
            student_id: studentId || null,
            faculty_id: facultyId || null
        };

        const newUser = await createUser(userData);

        console.log(`✅ New user registered: ${username} (${role})`);
        res.json({ 
            message: "User registered successfully", 
            user: newUser 
        });
    } catch (err) {
        console.error('Server signup error:', err);
        res.status(500).json({ 
            message: "Error registering user", 
            error: err.message 
        });
    }
});

// ✅ Login Route
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
        return res.status(400).json({ 
            message: "Username and password are required" 
        });
    }

    try {
        const user = await findUserByUsername(username);
        
        if (!user) {
            console.error('User not found:', username);
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.error('Invalid password for user:', username);
            return res.status(401).json({ message: "Invalid username or password" });
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        console.log(`✅ Login successful: ${username} (${userWithoutPassword.role})`);
        
        res.json({ 
            message: "Login successful", 
            user: userWithoutPassword 
        });
    } catch (err) {
        console.error('Server login error:', err);
        res.status(500).json({ 
            message: "Error during login", 
            error: err.message 
        });
    }
});

// ✅ Get all students
app.get("/api/students", async (req, res) => {
    try {
        const students = await getUsers('student');
        res.json(students);
    } catch (err) {
        res.status(500).send("Error fetching students");
    }
});

// ✅ Get all faculty
app.get("/api/faculty", async (req, res) => {
    try {
        const faculty = await getUsers('faculty');
        res.json(faculty);
    } catch (err) {
        res.status(500).send("Error fetching faculty");
    }
});

// ✅ Get projects for a student
app.get("/api/student/:studentId/projects", async (req, res) => {
    try {
        const { studentId } = req.params;
        
        if (dbConnected && supabase) {
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('student_id', studentId);

                if (!error) {
                    res.json(data);
                    return;
                }
            } catch (err) {
                console.log('Database error, using mock data');
            }
        }

        // Fallback to mock data
        const projects = mockProjects.filter(p => p.student_id === studentId);
        res.json(projects);
    } catch (err) {
        res.status(500).send("Error fetching projects");
    }
});

// ✅ Get all projects (for faculty)
app.get("/api/projects", async (req, res) => {
    try {
        if (dbConnected && supabase) {
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select(`
                        *,
                        users!projects_student_id_fkey(username, student_id)
                    `);

                if (!error) {
                    res.json(data);
                    return;
                }
            } catch (err) {
                console.log('Database error, using mock data');
            }
        }

        // Fallback to mock data
        const projectsWithUsers = mockProjects.map(project => {
            const user = mockUsers.find(u => u.id === project.student_id);
            return {
                ...project,
                users: user ? { username: user.username, student_id: user.student_id } : null
            };
        });
        res.json(projectsWithUsers);
    } catch (err) {
        res.status(500).send("Error fetching projects");
    }
});

// ✅ Get subtasks for a project
app.get("/api/project/:projectId/subtasks", async (req, res) => {
    try {
        const { projectId } = req.params;
        
        if (dbConnected && supabase) {
            try {
                const { data, error } = await supabase
                    .from('subtasks')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false });

                if (!error) {
                    res.json(data);
                    return;
                }
            } catch (err) {
                console.log('Database error, using mock data');
            }
        }

        // Fallback to mock data
        const subtasks = mockSubtasks.filter(s => s.project_id === projectId);
        res.json(subtasks);
    } catch (err) {
        res.status(500).send("Error fetching subtasks");
    }
});

// ✅ Add subtask (student)
app.post("/api/subtask", async (req, res) => {
    try {
        const { project_id, title, description, due_date } = req.body;
        
        if (dbConnected && supabase) {
            try {
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

                if (!error) {
                    res.json({ message: "Subtask added successfully", data: data[0] });
                    return;
                }
            } catch (err) {
                console.log('Database error, using mock data');
            }
        }

        // Fallback to mock data
        const newSubtask = {
            id: (mockSubtasks.length + 1).toString(),
            project_id,
            title,
            description,
            status: 'pending',
            marks: null,
            feedback: null,
            due_date,
            created_at: new Date().toISOString()
        };

        mockSubtasks.push(newSubtask);
        res.json({ message: "Subtask added successfully", data: newSubtask });
    } catch (err) {
        res.status(500).send("Error adding subtask");
    }
});

// ✅ Update subtask marks and feedback (faculty)
app.put("/api/subtask/:subtaskId/evaluate", async (req, res) => {
    try {
        const { subtaskId } = req.params;
        const { marks, feedback, status } = req.body;
        
        if (dbConnected && supabase) {
            try {
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

                if (!error) {
                    res.json({ message: "Subtask evaluated successfully", data: data[0] });
                    return;
                }
            } catch (err) {
                console.log('Database error, using mock data');
            }
        }

        // Fallback to mock data
        const subtask = mockSubtasks.find(s => s.id === subtaskId);
        if (subtask) {
            subtask.marks = marks;
            subtask.feedback = feedback;
            subtask.status = status;
            subtask.evaluated_at = new Date().toISOString();
            res.json({ message: "Subtask evaluated successfully", data: subtask });
        } else {
            res.status(404).json({ message: "Subtask not found" });
        }
    } catch (err) {
        res.status(500).send("Error updating subtask");
    }
});

// ✅ Create project
app.post("/api/project", async (req, res) => {
    try {
        const { student_id, title, description, due_date } = req.body;
        
        if (dbConnected && supabase) {
            try {
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

                if (!error) {
                    res.json({ message: "Project created successfully", data: data[0] });
                    return;
                }
            } catch (err) {
                console.log('Database error, using mock data');
            }
        }

        // Fallback to mock data
        const newProject = {
            id: (mockProjects.length + 1).toString(),
            student_id,
            title,
            description,
            status: 'active',
            due_date,
            created_at: new Date().toISOString()
        };

        mockProjects.push(newProject);
        res.json({ message: "Project created successfully", data: newProject });
    } catch (err) {
        res.status(500).json({ message: "Error creating project", error: err.message });
    }
});

// ✅ Assign project to student (faculty only)
app.post("/api/assign-project", async (req, res) => {
    try {
        const { student_id, title, description, due_date, faculty_id } = req.body;
        
        if (dbConnected && supabase) {
            try {
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

                if (!error) {
                    res.json({ 
                        message: `Project assigned to ${student.username} successfully`, 
                        data: data[0] 
                    });
                    return;
                }
            } catch (err) {
                console.log('Database error, using mock data');
            }
        }

        // Fallback to mock data
        const newProject = {
            id: (mockProjects.length + 1).toString(),
            student_id,
            title,
            description,
            status: 'active',
            due_date,
            created_at: new Date().toISOString()
        };

        mockProjects.push(newProject);
        res.json({ message: "Project assigned successfully", data: newProject });
    } catch (err) {
        res.status(500).json({ message: "Error assigning project", error: err.message });
    }
});

// ✅ Update project status
app.put("/api/project/:projectId/status", async (req, res) => {
    try {
        const { projectId } = req.params;
        const { status } = req.body;
        
        if (dbConnected && supabase) {
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .update({ 
                        status: status,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', projectId)
                    .select();

                if (!error) {
                    res.json({ message: "Project status updated successfully", data: data[0] });
                    return;
                }
            } catch (err) {
                console.log('Database error, using mock data');
            }
        }

        // Fallback to mock data
        const project = mockProjects.find(p => p.id === projectId);
        if (project) {
            project.status = status;
            project.updated_at = new Date().toISOString();
            res.json({ message: "Project status updated successfully", data: project });
        } else {
            res.status(404).json({ message: "Project not found" });
        }
    } catch (err) {
        res.status(500).json({ message: "Error updating project status", error: err.message });
    }
});

// ✅ Get project progress summary
app.get("/api/project/:projectId/progress", async (req, res) => {
    try {
        const { projectId } = req.params;
        
        if (dbConnected && supabase) {
            try {
                const { data, error } = await supabase
                    .from('subtasks')
                    .select('*')
                    .eq('project_id', projectId);

                if (!error) {
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
                    return;
                }
            } catch (err) {
                console.log('Database error, using mock data');
            }
        }

        // Fallback to mock data
        const subtasks = mockSubtasks.filter(s => s.project_id === projectId);
        const totalSubtasks = subtasks.length;
        const completedSubtasks = subtasks.filter(s => s.status === 'completed').length;
        const progressPercentage = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
        const averageMarks = subtasks.filter(s => s.marks !== null).reduce((sum, s) => sum + s.marks, 0) / subtasks.filter(s => s.marks !== null).length || 0;

        res.json({
            totalSubtasks,
            completedSubtasks,
            progressPercentage,
            averageMarks: Math.round(averageMarks * 100) / 100,
            subtasks: subtasks
        });
    } catch (err) {
        res.status(500).json({ message: "Error fetching progress", error: err.message });
    }
});

// Serve static files from the current directory (after API routes)
app.use(express.static('.'));

// Start Server
app.listen(config.server.port, () => {
    console.log("🚀 Progresso Server running on http://localhost:" + config.server.port);
    console.log("📝 Environment:", config.server.environment);
    console.log("🔗 Supabase URL:", config.supabase.url);
    console.log("💾 Database Status:", dbConnected ? "✅ Connected" : "⚠️  Using Mock Data");
    console.log("💡 Test the application: http://localhost:" + config.server.port + "/auth.html");
    
    if (!dbConnected) {
        console.log("\n📋 To connect to Supabase:");
        console.log("1. Go to: https://supabase.com/dashboard/project/nkaafhuafausmcvzeanw/sql");
        console.log("2. Run the supabase-schema.sql script");
        console.log("3. Restart the server");
    }
    
    console.log("\n📝 Test Credentials (Mock Data):");
    console.log("   Student: john_doe / password123");
    console.log("   Student: jane_smith / password123");
    console.log("   Faculty: prof_wilson / password123");
});

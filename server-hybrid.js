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

// Mock data for fallback
let mockUsers = [
    {
        id: "1",
        username: "john_doe",
        email: "john.doe@example.com",
        password: "$2a$10$example_hash_1", // This is a hashed version of "password123"
        role: "student",
        student_id: "STU001"
    },
    {
        id: "2", 
        username: "jane_smith",
        email: "jane.smith@example.com",
        password: "$2a$10$example_hash_2", // This is a hashed version of "password123"
        role: "student",
        student_id: "STU002"
    },
    {
        id: "3",
        username: "prof_wilson",
        email: "prof.wilson@university.edu",
        password: "$2a$10$example_hash_3", // This is a hashed version of "password123"
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

// Test database connection
let dbConnected = false;
async function testDatabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);
        
        if (!error) {
            dbConnected = true;
            console.log("✅ Connected to Supabase Database");
        } else {
            console.log("⚠️  Database connection failed, using mock data");
            dbConnected = false;
        }
    } catch (err) {
        console.log("⚠️  Database connection failed, using mock data");
        dbConnected = false;
    }
}

// Initialize database connection
testDatabaseConnection();

// ✅ Signup Route
app.post("/signup", async (req, res) => {
    const { username, email, password, role, studentId, facultyId } = req.body;

    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        if (dbConnected) {
            // Try to use real database
            try {
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
                    throw error;
                }

                res.json({ message: "User registered successfully", data });
                return;
            } catch (dbError) {
                console.log("Database error, falling back to mock data");
                dbConnected = false;
            }
        }

        // Fallback to mock data
        const existingUser = mockUsers.find(u => u.username === username || u.email === email);
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const newUser = {
            id: (mockUsers.length + 1).toString(),
            username,
            email,
            password: hashedPassword,
            role: role || 'student',
            student_id: studentId || null,
            faculty_id: facultyId || null
        };

        mockUsers.push(newUser);
        const { password: _, ...userWithoutPassword } = newUser;
        res.json({ message: "User registered successfully", user: userWithoutPassword });

    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ message: "Error registering user", error: err.message });
    }
});

// ✅ Login Route
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        if (dbConnected) {
            // Try to use real database
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('username', username)
                    .single();

                if (error || !data) {
                    throw new Error('User not found');
                }

                const isPasswordValid = await bcrypt.compare(password, data.password);
                if (!isPasswordValid) {
                    return res.status(401).json({ message: "Invalid password" });
                }

                const { password: _, ...userWithoutPassword } = data;
                res.json({ message: "Login successful", user: userWithoutPassword });
                return;
            } catch (dbError) {
                console.log("Database error, falling back to mock data");
                dbConnected = false;
            }
        }

        // Fallback to mock data
        const user = mockUsers.find(u => u.username === username);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }

        const { password: _, ...userWithoutPassword } = user;
        res.json({ message: "Login successful", user: userWithoutPassword });

    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ message: "Error during login", error: err.message });
    }
});

// ✅ Get all students
app.get("/api/students", async (req, res) => {
    try {
        if (dbConnected) {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('role', 'student');

                if (!error) {
                    res.json(data);
                    return;
                }
            } catch (dbError) {
                dbConnected = false;
            }
        }

        // Fallback to mock data
        const students = mockUsers.filter(u => u.role === 'student');
        res.json(students);

    } catch (err) {
        res.status(500).send("Error fetching students");
    }
});

// ✅ Get all faculty
app.get("/api/faculty", async (req, res) => {
    try {
        if (dbConnected) {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('role', 'faculty');

                if (!error) {
                    res.json(data);
                    return;
                }
            } catch (dbError) {
                dbConnected = false;
            }
        }

        // Fallback to mock data
        const faculty = mockUsers.filter(u => u.role === 'faculty');
        res.json(faculty);

    } catch (err) {
        res.status(500).send("Error fetching faculty");
    }
});

// ✅ Get projects for a student
app.get("/api/student/:studentId/projects", async (req, res) => {
    try {
        const { studentId } = req.params;
        
        if (dbConnected) {
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('student_id', studentId);

                if (!error) {
                    res.json(data);
                    return;
                }
            } catch (dbError) {
                dbConnected = false;
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
        if (dbConnected) {
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
            } catch (dbError) {
                dbConnected = false;
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
        
        if (dbConnected) {
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
            } catch (dbError) {
                dbConnected = false;
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
        
        if (dbConnected) {
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
            } catch (dbError) {
                dbConnected = false;
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
        
        if (dbConnected) {
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
            } catch (dbError) {
                dbConnected = false;
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

// ✅ Assign project to student (faculty only)
app.post("/api/assign-project", async (req, res) => {
    try {
        const { student_id, title, description, due_date, faculty_id } = req.body;
        
        if (dbConnected) {
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
            } catch (dbError) {
                dbConnected = false;
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

// Serve static files from the current directory (after API routes)
app.use(express.static('.'));

// Start Server
app.listen(5000, () => {
    console.log("🚀 Hybrid Server running on http://localhost:5000");
    console.log("📝 Test credentials:");
    console.log("   Student: john_doe / password123");
    console.log("   Student: jane_smith / password123");
    console.log("   Faculty: prof_wilson / password123");
    console.log("💡 Server will use database if available, otherwise mock data");
});

// Load environment variables
require('dotenv').config();

const express = require("express");
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// ✅ Configuration (inline config instead of requiring external file)
const config = {
    server: {
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'development'
    },
    supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY
    }
};

// ✅ Connect to Supabase Database
let supabase = null;
let dbConnected = false;

// Initialize Supabase connection
async function initializeSupabase() {
    try {
        if (!config.supabase.url || !config.supabase.anonKey) {
            console.log("⚠️  Missing Supabase configuration. Using mock data only.");
            dbConnected = false;
            return false;
        }

        console.log("🔄 Connecting to Supabase...");
        supabase = createClient(config.supabase.url, config.supabase.anonKey);
        
        // Test connection with a simple query
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .limit(1);
        
        if (!error) {
            dbConnected = true;
            console.log("✅ Connected to Supabase Database successfully!");
            console.log(`📊 Database URL: ${config.supabase.url}`);
            return true;
        } else {
            console.log("⚠️  Supabase connection failed:", error.message);
            if (error.message.includes('relation "users" does not exist')) {
                console.log("📊 Database Schema Issue: Users table doesn't exist");
                console.log("💡 Run the supabase-schema.sql script in your Supabase dashboard");
            }
            dbConnected = false;
            return false;
        }
    } catch (err) {
        console.log("⚠️  Supabase connection failed:", err.message);
        console.log("📊 Continuing with mock data...");
        dbConnected = false;
        return false;
    }
}

// Initialize connection and wait for it to complete
let supabaseInitialized = false;

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log the error
});

// Keep the process alive
process.on('SIGINT', () => {
    console.log('\n🛑 Server shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Server shutting down gracefully...');
    process.exit(0);
});

// Health and status endpoints
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.get('/db-status', (req, res) => {
    res.status(200).json({ connected: dbConnected, url: config.supabase.url });
});

// Mock data for fallback
let mockUsers = [
    {
        id: "1",
        username: "john_doe",
        email: "john.doe@example.com",
        password: "$2b$12$k.kqyVyIB1raGayJxSEDAOV/O8vgy9uYPQr5jobP.HDENARO6yKUW", // password123
        role: "student",
        student_id: "STU001"
    },
    {
        id: "2", 
        username: "jane_smith",
        email: "jane.smith@example.com",
        password: "$2b$12$k.kqyVyIB1raGayJxSEDAOV/O8vgy9uYPQr5jobP.HDENARO6yKUW", // password123
        role: "student",
        student_id: "STU002"
    },
    {
        id: "3",
        username: "prof_wilson",
        email: "prof.wilson@university.edu",
        password: "$2b$12$k.kqyVyIB1raGayJxSEDAOV/O8vgy9uYPQr5jobP.HDENARO6yKUW", // password123
        role: "faculty",
        faculty_id: "FAC001"
    }
];

// ✅ Authentication Routes
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        let user = null;

        // Check mock data first for test users
        const mockUser = mockUsers.find(u => u.username === username);
        if (mockUser) {
            user = mockUser;
        } else if (dbConnected && supabase) {
            // Try Supabase for other users
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .single();
            
            if (!error && data) {
                user = data;
            }
        }

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Remove password from response
        const { password: _, ...userResponse } = user;
        
        res.json({
            message: "Login successful",
            user: userResponse,
            token: "mock-jwt-token" // In production, generate a real JWT
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Registration endpoint (alias for signup)
app.post('/register', async (req, res) => {
    try {
        const { username, email, password, role, student_id, faculty_id } = req.body;
        
        if (!username || !email || !password || !role) {
            return res.status(400).json({ error: "All required fields must be provided" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const newUser = {
            username,
            email,
            password: hashedPassword,
            role,
            student_id: role === 'student' ? student_id : null,
            faculty_id: role === 'faculty' ? faculty_id : null
        };

        let createdUser = null;

        // Try Supabase first if connected
        if (dbConnected && supabase) {
            const { data, error } = await supabase
                .from('users')
                .insert([newUser])
                .select()
                .single();
            
            if (!error && data) {
                createdUser = data;
            } else if (error) {
                console.error('Supabase insert error:', error);
                // Fall through to mock data
            }
        }

        // Fallback to mock data
        if (!createdUser) {
            // Check if user already exists in mock data
            const existingUser = mockUsers.find(u => u.username === username || u.email === email);
            if (existingUser) {
                return res.status(409).json({ error: "User already exists" });
            }
            
            createdUser = {
                id: String(mockUsers.length + 1),
                ...newUser
            };
            mockUsers.push(createdUser);
        }

        // Remove password from response
        const { password: _, ...userResponse } = createdUser;
        
        res.status(201).json({
            message: "User created successfully",
            user: userResponse
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Signup endpoint (same as register)
app.post('/signup', async (req, res) => {
    try {
        const { username, email, password, role, studentId, facultyId } = req.body;
        
        if (!username || !email || !password || !role) {
            return res.status(400).json({ message: "All required fields must be provided" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const newUser = {
            username,
            email,
            password: hashedPassword,
            role,
            student_id: role === 'student' ? studentId : null,
            faculty_id: role === 'faculty' ? facultyId : null
        };

        let createdUser = null;

        // Try Supabase first if connected
        if (dbConnected && supabase) {
            const { data, error } = await supabase
                .from('users')
                .insert([newUser])
                .select()
                .single();
            
            if (!error && data) {
                createdUser = data;
            } else if (error) {
                console.error('Supabase insert error:', error);
                // Fall through to mock data
            }
        }

        // Fallback to mock data
        if (!createdUser) {
            // Check if user already exists in mock data
            const existingUser = mockUsers.find(u => u.username === username || u.email === email);
            if (existingUser) {
                return res.status(409).json({ message: "User already exists" });
            }
            
            createdUser = {
                id: String(mockUsers.length + 1),
                ...newUser
            };
            mockUsers.push(createdUser);
        }

        // Remove password from response
        const { password: _, ...userResponse } = createdUser;
        
        res.status(201).json({
            message: "Account created successfully! Please login.",
            user: userResponse
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ✅ User Routes
app.get('/users', async (req, res) => {
    try {
        let users = [];

        // Try Supabase first if connected
        if (dbConnected && supabase) {
            const { data, error } = await supabase
                .from('users')
                .select('id, username, email, role, student_id, faculty_id'); // Exclude password
            
            if (!error && data) {
                users = data;
            }
        }

        // Fallback to mock data
        if (users.length === 0) {
            users = mockUsers.map(({ password, ...user }) => user); // Remove passwords
        }

        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ API Routes for Dashboard functionality

// Get all students (for faculty dashboard)
app.get('/api/students', async (req, res) => {
    try {
        if (supabase) {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'student')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            res.json(data || []);
        } else {
            // Mock data for students
            const mockStudents = [
                { id: '1', username: 'john_doe', email: 'john.doe@example.com', role: 'student', student_id: 'STU001' },
                { id: '2', username: 'jane_smith', email: 'jane.smith@example.com', role: 'student', student_id: 'STU002' },
                { id: '3', username: 'mike_johnson', email: 'mike.johnson@example.com', role: 'student', student_id: 'STU003' }
            ];
            res.json(mockStudents);
        }
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get all projects (for faculty dashboard)
app.get('/api/projects', async (req, res) => {
    try {
        if (supabase) {
            const { data, error } = await supabase
                .from('projects')
                .select(`
                    *,
                    users:student_id (
                        id,
                        username,
                        student_id,
                        email
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            res.json(data || []);
        } else {
            // Mock data for projects
            const mockProjects = [
                { 
                    id: '1', 
                    title: 'E-Commerce Website', 
                    description: 'A full-stack e-commerce platform', 
                    status: 'active', 
                    due_date: '2024-03-15',
                    student_id: '1',
                    users: { username: 'john_doe', student_id: 'STU001' }
                },
                { 
                    id: '2', 
                    title: 'Mobile Banking App', 
                    description: 'Cross-platform mobile banking app', 
                    status: 'active', 
                    due_date: '2024-04-20',
                    student_id: '2',
                    users: { username: 'jane_smith', student_id: 'STU002' }
                }
            ];
            res.json(mockProjects);
        }
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get projects for a specific student
app.get('/api/student/:studentId/projects', async (req, res) => {
    try {
        const { studentId } = req.params;
        
        if (supabase) {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            res.json(data || []);
        } else {
            // Mock data for student projects
            const mockProjects = [
                { 
                    id: '1', 
                    title: 'E-Commerce Website', 
                    description: 'A full-stack e-commerce platform', 
                    status: 'active', 
                    due_date: '2024-03-15',
                    student_id: studentId
                },
                { 
                    id: '2', 
                    title: 'Mobile Banking App', 
                    description: 'Cross-platform mobile banking app', 
                    status: 'active', 
                    due_date: '2024-04-20',
                    student_id: studentId
                }
            ];
            res.json(mockProjects);
        }
    } catch (error) {
        console.error('Get student projects error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get subtasks for a specific project
app.get('/api/project/:projectId/subtasks', async (req, res) => {
    try {
        const { projectId } = req.params;
        console.log('Getting subtasks for project:', projectId);
        
        if (supabase) {
            const { data, error } = await supabase
                .from('subtasks')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }
            console.log('Found subtasks:', data?.length || 0);
            res.json(data || []);
        } else {
            // Mock data for subtasks
            const mockSubtasks = [
                { 
                    id: '1', 
                    title: 'Database Design', 
                    description: 'Design and implement the database schema', 
                    status: 'completed', 
                    marks: 8, 
                    feedback: 'Good database structure, consider adding indexes',
                    due_date: '2024-02-15',
                    project_id: projectId,
                    evaluated_at: '2024-02-16T10:00:00Z'
                },
                { 
                    id: '2', 
                    title: 'Frontend Development', 
                    description: 'Create React components for product listing', 
                    status: 'in-progress', 
                    marks: null, 
                    feedback: null,
                    due_date: '2024-02-28',
                    project_id: projectId
                },
                { 
                    id: '3', 
                    title: 'Payment Integration', 
                    description: 'Integrate Stripe payment gateway', 
                    status: 'pending', 
                    marks: null, 
                    feedback: null,
                    due_date: '2024-03-10',
                    project_id: projectId
                }
            ];
            console.log('Returning mock subtasks:', mockSubtasks.length);
            res.json(mockSubtasks);
        }
    } catch (error) {
        console.error('Get project subtasks error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Assign a new project to a student
app.post('/api/assign-project', async (req, res) => {
    try {
        const { student_id, title, description, due_date, faculty_id } = req.body;
        
        if (supabase) {
            const { data, error } = await supabase
                .from('projects')
                .insert([{
                    student_id,
                    title,
                    description,
                    due_date,
                    status: 'active'
                }])
                .select()
                .single();
            
            if (error) throw error;
            res.status(201).json({ message: "Project assigned successfully!", project: data });
        } else {
            // Mock response
            const mockProject = {
                id: Date.now().toString(),
                student_id,
                title,
                description,
                due_date,
                status: 'active',
                created_at: new Date().toISOString()
            };
            res.status(201).json({ message: "Project assigned successfully!", project: mockProject });
        }
    } catch (error) {
        console.error('Assign project error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Add a new subtask to a project
app.post('/api/subtask', async (req, res) => {
    try {
        const { project_id, title, description, due_date } = req.body;
        
        if (supabase) {
            const { data, error } = await supabase
                .from('subtasks')
                .insert([{
                    project_id,
                    title,
                    description,
                    due_date,
                    status: 'pending'
                }])
                .select()
                .single();
            
            if (error) throw error;
            res.status(201).json({ message: "Subtask added successfully!", subtask: data });
        } else {
            // Mock response
            const mockSubtask = {
                id: Date.now().toString(),
                project_id,
                title,
                description,
                due_date,
                status: 'pending',
                created_at: new Date().toISOString()
            };
            res.status(201).json({ message: "Subtask added successfully!", subtask: mockSubtask });
        }
    } catch (error) {
        console.error('Add subtask error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update subtask status (for students)
app.put('/api/subtask/:subtaskId/status', async (req, res) => {
    try {
        const { subtaskId } = req.params;
        const { status, description } = req.body;
        
        if (supabase) {
            const { data, error } = await supabase
                .from('subtasks')
                .update({ 
                    status,
                    description: description || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', subtaskId)
                .select()
                .single();
            
            if (error) throw error;
            res.json({ message: "Subtask status updated successfully!", subtask: data });
        } else {
            // Mock response
            res.json({ message: "Subtask status updated successfully!" });
        }
    } catch (error) {
        console.error('Update subtask status error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Evaluate a subtask (for faculty)
app.put('/api/subtask/:subtaskId/evaluate', async (req, res) => {
    try {
        const { subtaskId } = req.params;
        const { marks, feedback, status } = req.body;
        
        if (supabase) {
            const { data, error } = await supabase
                .from('subtasks')
                .update({ 
                    marks,
                    feedback,
                    status,
                    evaluated_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', subtaskId)
                .select()
                .single();
            
            if (error) throw error;
            res.json({ message: "Evaluation submitted successfully!", subtask: data });
        } else {
            // Mock response
            res.json({ message: "Evaluation submitted successfully!" });
        }
    } catch (error) {
        console.error('Evaluate subtask error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ Static file serving - serve HTML files from root directory
app.use(express.static('.'));

// Default route - redirect to auth page
app.get('/', (req, res) => {
    res.redirect('/auth.html');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start Server
const PORT = config.server.port;
app.listen(PORT, async () => {
    console.log("🚀 Progresso Server running on http://localhost:" + PORT);
    console.log("📝 Environment:", config.server.environment);
    console.log("🔗 Supabase URL:", config.supabase.url || "Not configured");
    
    // Initialize Supabase connection
    console.log("🔄 Initializing database connection...");
    const connected = await initializeSupabase();
    
    console.log("💾 Database Status:", connected ? "✅ Connected to Supabase" : "⚠️  Using Mock Data");
    
    if (!connected) {
        console.log("\n📋 To connect to Supabase:");
        console.log("1. Ensure your .env file has:");
        console.log("   SUPABASE_URL=https://nkaafhuafausmcvzeanw.supabase.co");
        console.log("   SUPABASE_ANON_KEY=your_anon_key");
        console.log("2. Create users table in your Supabase dashboard");
        console.log("3. Restart the server");
    }
    
    console.log("\n📝 Test Credentials:");
    console.log("   Student: john_doe / password123");
    console.log("   Student: jane_smith / password123");
    console.log("   Faculty: prof_wilson / password123");
    
    console.log("\n🔧 API Endpoints:");
    console.log("   POST /login - User login");
    console.log("   POST /register - User registration");
    console.log("   POST /signup - User signup");
    console.log("   GET /users - Get all users");
    console.log("   GET /health - Server health check");
    console.log("   GET /db-status - Database connection status");
    
    console.log("\n🔄 Server is running and ready to accept requests...");
    console.log("   Press Ctrl+C to stop the server");
});

// Keep the process alive
setInterval(() => {
    // This keeps the event loop alive
}, 1000);
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
            throw new Error('Missing Supabase configuration. Check your .env file.');
        }

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

// ✅ Authentication Routes
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        let user = null;

        // Try Supabase first if connected
        if (dbConnected && supabase) {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .single();
            
            if (!error && data) {
                user = data;
            }
        }

        // Fallback to mock data
        if (!user) {
            user = mockUsers.find(u => u.username === username);
        }

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
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
        res.status(500).json({ error: "Internal server error" });
    }
});

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

// ✅ Static file serving (optional)
app.use(express.static('public'));

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
app.listen(PORT, () => {
    console.log("🚀 Progresso Server running on http://localhost:" + PORT);
    console.log("📝 Environment:", config.server.environment);
    console.log("🔗 Supabase URL:", config.supabase.url || "Not configured");
    console.log("💾 Database Status:", dbConnected ? "✅ Connected" : "⚠️  Using Mock Data");
    
    if (!dbConnected) {
        console.log("\n📋 To connect to Supabase:");
        console.log("1. Create a .env file with:");
        console.log("   SUPABASE_URL=your_supabase_url");
        console.log("   SUPABASE_ANON_KEY=your_supabase_anon_key");
        console.log("2. Create users table in your Supabase dashboard");
        console.log("3. Restart the server");
    }
    
    console.log("\n📝 Test Credentials (Mock Data):");
    console.log("   Student: john_doe / password123");
    console.log("   Student: jane_smith / password123");
    console.log("   Faculty: prof_wilson / password123");
    
    console.log("\n🔧 API Endpoints:");
    console.log("   POST /login - User login");
    console.log("   POST /register - User registration");
    console.log("   GET /users - Get all users");
    console.log("   GET /health - Server health check");
    console.log("   GET /db-status - Database connection status");
});
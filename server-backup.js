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
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

// Test database connection with retry logic
async function testDatabaseConnection(retryCount = 0) {
    try {
        console.log(`🔍 Testing Supabase connection (attempt ${retryCount + 1})...`);
        
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);
        
        if (!error) {
            console.log("✅ Connected to Supabase Database successfully!");
            console.log(`📊 Database URL: ${config.supabase.url}`);
            return true;
        } else {
            console.log("⚠️  Database connection failed:", error.message);
            
            // Check for specific error types
            if (error.message.includes('Invalid API key')) {
                console.log("🔑 API Key Issue: Please check your Supabase anon key");
            } else if (error.message.includes('relation "users" does not exist')) {
                console.log("📊 Schema Issue: Users table doesn't exist. Run supabase-schema.sql first");
            } else if (error.message.includes('JWT')) {
                console.log("🔐 JWT Issue: Check your Supabase project settings");
            }
            
            // Retry logic
            if (retryCount < config.database.retryAttempts - 1) {
                console.log(`⏳ Retrying in ${config.database.retryDelay}ms...`);
                setTimeout(() => testDatabaseConnection(retryCount + 1), config.database.retryDelay);
            } else {
                console.log("❌ Max retry attempts reached. Please check your configuration.");
            }
            return false;
        }
    } catch (err) {
        console.log("⚠️  Database connection failed:", err.message);
        
        if (retryCount < config.database.retryAttempts - 1) {
            console.log(`⏳ Retrying in ${config.database.retryDelay}ms...`);
            setTimeout(() => testDatabaseConnection(retryCount + 1), config.database.retryDelay);
        }
        return false;
    }
}

// Test connection on startup
testDatabaseConnection();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.log('Uncaught Exception:', error);
    // Don't exit the process, just log the error
});

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
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('username, email')
            .or(`username.eq."${username}",email.eq."${email}"`)
            .limit(1);

        if (checkError) {
            console.error('Error checking existing user:', checkError);
            return res.status(500).json({ message: "Error checking user existence" });
        }

        if (existingUser && existingUser.length > 0) {
            const conflict = existingUser[0];
            if (conflict.username === username) {
                return res.status(409).json({ message: "Username already exists" });
            } else if (conflict.email === email) {
                return res.status(409).json({ message: "Email already exists" });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

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
            ])
            .select('id, username, email, role, student_id, faculty_id, created_at');

        if (error) {
            console.error('Supabase signup error:', error);
            return res.status(500).json({ 
                message: "Error registering user", 
                error: error.message 
            });
        }

        console.log(`✅ New user registered: ${username} (${role})`);
        res.json({ 
            message: "User registered successfully", 
            user: data[0] 
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
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (error) {
            console.error('Login error for user:', username, error.message);
            return res.status(401).json({ message: "Invalid username or password" });
        }

        if (!data) {
            console.error('User not found:', username);
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const isPasswordValid = await bcrypt.compare(password, data.password);
        if (!isPasswordValid) {
            console.error('Invalid password for user:', username);
            return res.status(401).json({ message: "Invalid username or password" });
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = data;
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

// Serve static files from the current directory (after API routes)
app.use(express.static('.'));

// Start Server
app.listen(config.server.port, () => {
    console.log("🚀 Progresso Server running on http://localhost:" + config.server.port);
    console.log("📝 Environment:", config.server.environment);
    console.log("🔗 Supabase URL:", config.supabase.url);
    console.log("💡 Test the connection by visiting: http://localhost:" + config.server.port + "/auth.html");
});

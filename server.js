const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// ✅ Connect to MySQL Database
const db = mysql.createConnection({
    host: "localhost",
    user: "root",   // default in XAMPP
    password: "",   // leave empty if no password in XAMPP
    database: "progresso_db"
});

db.connect(err => {
    if (err) throw err;
    console.log("✅ Connected to MySQL Database");
});

// ✅ Signup Route
app.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
        "INSERT INTO users (USERNAME, EMAIL, PASSWORD) VALUES (?, ?, ?)",
        [username, email, hashedPassword],
        (err, result) => {
            if (err) return res.status(500).send("Error registering user");
            res.send("User registered successfully");
        }
    );
});

// ✅ Login Route
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    db.query(
        "SELECT * FROM users WHERE USERNAME = ?",
        [username],
        async (err, results) => {
            if (err) return res.status(500).send("Error during login");
            if (results.length === 0) return res.status(401).send("User not found");

            const user = results[0];

            // 👇 Fix here: use user.PASSWORD (DB column name)
            const isPasswordValid = await bcrypt.compare(password, user.PASSWORD);
            if (!isPasswordValid) return res.status(401).send("Invalid password");

            res.send("Login successful");
        }
    );
});

// Start Server
app.listen(5000, () => {
    console.log("🚀 Server running on http://localhost:5000");
});

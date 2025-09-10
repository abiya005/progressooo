# Progresso - Project Evaluation Platform

A comprehensive project evaluation platform with separate dashboards for students and faculty, built with Node.js, Express, and Supabase.

## Features

### Student Dashboard
- View personal project details and progress
- Add and manage subtasks for projects
- View marks and feedback from faculty
- Track overall project status and completion percentage

### Faculty Dashboard
- View all students and their projects
- Evaluate subtasks with marks and feedback
- Monitor project progress across all students
- Real-time updates when students add new subtasks

## Setup Instructions

### 1. Database Setup (Supabase)

1. Go to [Supabase](https://supabase.com) and create a new project
2. In your Supabase project dashboard, go to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql` into the SQL editor
4. Run the script to create all necessary tables, indexes, and sample data
5. Note down your Supabase URL and API key from the project settings

### 2. Update Configuration

The Supabase configuration is already set up in `server.js` with the provided credentials:
- Supabase URL: `https://nkaafhuafausmcvzeanw.supabase.co`
- API Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rYWFmaHVhZmF1c21jdnplYW53Iiwicm9sZSI6ImFub24iLCJ`

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Server

```bash
node server.js
```

The server will start on `http://localhost:5000`

### 5. Access the Application

1. Open `auth.html` in your browser
2. Create accounts for both students and faculty
3. Login to access the appropriate dashboard:
   - Students: `student-dashboard.html`
   - Faculty: `faculty-dashboard.html`

## Database Schema

### Tables

1. **users** - Stores user information (students and faculty)
2. **projects** - Stores project details linked to students
3. **subtasks** - Stores subtasks linked to projects with evaluation data

### Key Features

- Role-based authentication (student/faculty)
- Real-time synchronization between dashboards
- Progress tracking with visual indicators
- Comprehensive evaluation system
- Responsive design with consistent theming

## API Endpoints

### Authentication
- `POST /signup` - Register new user
- `POST /login` - User login

### Students
- `GET /api/students` - Get all students
- `GET /api/student/:studentId/projects` - Get projects for specific student

### Projects
- `GET /api/projects` - Get all projects (for faculty)
- `POST /api/project` - Create new project

### Subtasks
- `GET /api/project/:projectId/subtasks` - Get subtasks for project
- `POST /api/subtask` - Add new subtask (student)
- `PUT /api/subtask/:subtaskId/evaluate` - Evaluate subtask (faculty)

## Sample Data

The database schema includes sample data:
- 2 students (john_doe, jane_smith)
- 2 faculty members (prof_wilson, dr_brown)
- 4 sample projects with various subtasks
- Some completed evaluations for demonstration

## Usage

### For Students
1. Login with student credentials
2. View your projects and their progress
3. Add new subtasks to track your work
4. View feedback and marks from faculty

### For Faculty
1. Login with faculty credentials
2. View all students and their projects
3. Evaluate subtasks by providing marks and feedback
4. Monitor overall progress across all students

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Frontend**: HTML, CSS, JavaScript
- **Authentication**: bcryptjs for password hashing
- **Styling**: Custom CSS with consistent theming

## File Structure

```
progressooo/
├── auth.html                 # Authentication page
├── student-dashboard.html    # Student dashboard
├── faculty-dashboard.html    # Faculty dashboard
├── dashboard.html           # Original dashboard (legacy)
├── server.js               # Backend server
├── supabase-schema.sql     # Database schema
├── package.json            # Dependencies
└── styles.css             # Global styles
```

## Troubleshooting

1. **Database Connection Issues**: Verify your Supabase credentials
2. **CORS Errors**: Ensure the server is running on the correct port
3. **Authentication Issues**: Check that user roles are properly set
4. **Missing Data**: Run the database schema script to populate sample data

## Future Enhancements

- Real-time notifications
- File upload for project submissions
- Advanced analytics and reporting
- Mobile app development
- Integration with external tools

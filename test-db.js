// Test script to verify database connection and authentication
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = 'https://nkaafhuafausmcvzeanw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rYWFmaHVhZmF1c21jdnplYW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjU1MDEsImV4cCI6MjA3MzEwMTUwMX0.KMW3hYzQIR1kzrnUoj5eftBO2x8tTaOjUnMkycfOCqE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
    console.log('🔍 Testing database connection...');
    
    try {
        // Test 1: Check if users table exists and has data
        console.log('\n1. Testing users table...');
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*')
            .limit(5);
            
        if (usersError) {
            console.error('❌ Users table error:', usersError);
            return;
        }
        
        console.log('✅ Users table accessible');
        console.log('📊 Found', users.length, 'users');
        users.forEach(user => {
            console.log(`   - ${user.username} (${user.role}) - ID: ${user.id}`);
        });

        // Test 2: Test login functionality
        console.log('\n2. Testing login functionality...');
        if (users.length > 0) {
            const testUser = users[0];
            console.log(`   Testing login for: ${testUser.username}`);
            
            // Test password comparison
            const testPassword = 'password123'; // This should match the sample data
            const isPasswordValid = await bcrypt.compare(testPassword, testUser.password);
            console.log(`   Password valid: ${isPasswordValid}`);
        }

        // Test 3: Check projects table
        console.log('\n3. Testing projects table...');
        const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('*')
            .limit(3);
            
        if (projectsError) {
            console.error('❌ Projects table error:', projectsError);
        } else {
            console.log('✅ Projects table accessible');
            console.log('📊 Found', projects.length, 'projects');
        }

        // Test 4: Check subtasks table
        console.log('\n4. Testing subtasks table...');
        const { data: subtasks, error: subtasksError } = await supabase
            .from('subtasks')
            .select('*')
            .limit(3);
            
        if (subtasksError) {
            console.error('❌ Subtasks table error:', subtasksError);
        } else {
            console.log('✅ Subtasks table accessible');
            console.log('📊 Found', subtasks.length, 'subtasks');
        }

        // Test 5: Test creating a new user
        console.log('\n5. Testing user creation...');
        const testUsername = 'test_user_' + Date.now();
        const testEmail = testUsername + '@example.com';
        const hashedPassword = await bcrypt.hash('testpassword', 10);
        
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{
                username: testUsername,
                email: testEmail,
                password: hashedPassword,
                role: 'student',
                student_id: 'TEST001'
            }])
            .select();
            
        if (createError) {
            console.error('❌ User creation error:', createError);
        } else {
            console.log('✅ User creation successful');
            console.log('   Created user:', newUser[0].username);
            
            // Clean up test user
            await supabase
                .from('users')
                .delete()
                .eq('id', newUser[0].id);
            console.log('   Test user cleaned up');
        }

        console.log('\n🎉 Database test completed successfully!');
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
    }
}

// Run the test
testDatabase();

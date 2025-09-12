const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const config = require('./config');

const supabase = createClient(config.supabase.url, config.supabase.anonKey);

async function setupUsers() {
    try {
        console.log('🔧 Setting up users in Supabase...');
        
        // Hash passwords
        const passwordHash = await bcrypt.hash('password123', 10);
        
        // Users to insert
        const users = [
            {
                id: '550e8400-e29b-41d4-a716-446655440001',
                username: 'john_doe',
                email: 'john.doe@example.com',
                password: passwordHash,
                role: 'student',
                full_name: 'John Doe',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '550e8400-e29b-41d4-a716-446655440002',
                username: 'jane_smith',
                email: 'jane.smith@example.com',
                password: passwordHash,
                role: 'student',
                full_name: 'Jane Smith',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '550e8400-e29b-41d4-a716-446655440003',
                username: 'prof_wilson',
                email: 'prof.wilson@example.com',
                password: passwordHash,
                role: 'faculty',
                full_name: 'Professor Wilson',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];
        
        // Upsert users by username to avoid duplicates
        console.log('👥 Upserting users...');
        const { data, error } = await supabase
            .from('users')
            .upsert(users, { onConflict: 'username' });
        
        if (error) {
            console.log('❌ Error inserting users:', error.message);
            return;
        }
        
        console.log('✅ Users inserted successfully!');
        console.log('📝 Test Credentials:');
        console.log('   Student: john_doe / password123');
        console.log('   Student: jane_smith / password123');
        console.log('   Faculty: prof_wilson / password123');
        
    } catch (err) {
        console.log('❌ Error setting up users:', err.message);
    }
}

setupUsers();

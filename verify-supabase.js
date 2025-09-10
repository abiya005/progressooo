// Simple script to verify Supabase connection
const { createClient } = require('@supabase/supabase-js');

// Test with the provided credentials
const supabaseUrl = 'https://nkaafhuafausmcvzeanw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rYWFmaHVhZmF1c21jdnplYW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjU1MDEsImV4cCI6MjA3MzEwMTUwMX0.KMW3hYzQIR1kzrnUoj5eftBO2x8tTaOjUnMkycfOCqE';

console.log('🔍 Verifying Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key (first 20 chars):', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyConnection() {
    try {
        // Test 1: Simple query to test connection
        console.log('\n1. Testing basic connection...');
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);
            
        if (error) {
            console.error('❌ Connection failed:', error);
            
            // Check if it's a table issue vs key issue
            if (error.message.includes('Invalid API key')) {
                console.log('\n🔑 API Key Issue:');
                console.log('- The API key might be incorrect');
                console.log('- Make sure you copied the complete key from Supabase dashboard');
                console.log('- Check that you are using the "anon public" key, not the "service_role" key');
            } else if (error.message.includes('relation "users" does not exist')) {
                console.log('\n📊 Database Schema Issue:');
                console.log('- The users table does not exist');
                console.log('- You need to run the supabase-schema.sql script first');
            } else {
                console.log('\n❓ Other Error:', error.message);
            }
            return;
        }
        
        console.log('✅ Connection successful!');
        console.log('📊 Data received:', data);
        
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

verifyConnection();

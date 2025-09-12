const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const supabase = createClient(config.supabase.url, config.supabase.anonKey);

async function testConnection() {
    try {
        console.log('🔍 Testing Supabase connection...');
        console.log('URL:', config.supabase.url);
        
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .limit(1);
        
        if (error) {
            console.log('❌ Supabase error:', error.message);
        } else {
            console.log('✅ Supabase connection successful!');
            console.log('Data:', data);
        }
    } catch (err) {
        console.log('❌ Connection failed:', err.message);
    }
}

testConnection();

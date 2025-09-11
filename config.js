// Configuration file for the Progresso application
module.exports = {
    // Supabase Configuration
    supabase: {
        url: 'https://nkaafhuafausmcvzeanw.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rYWFmaHVhZmF1c21jdnplYW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjU1MDEsImV4cCI6MjA3MzEwMTUwMX0.KMW3hYzQIR1kzrnUoj5eftBO2x8tTaOjUnMkycfOCqE'
    },
    
    // Server Configuration
    server: {
        port: process.env.PORT || 5000,
        environment: process.env.NODE_ENV || 'development'
    },
    
    // JWT Configuration (for future token-based auth)
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
        expiresIn: '24h'
    },
    
    // Database Configuration
    database: {
        retryAttempts: 3,
        retryDelay: 1000
    }
};

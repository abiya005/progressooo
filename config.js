// config.js
module.exports = {
  server: {
    port: process.env.PORT || 5000,
    environment: process.env.NODE_ENV || 'development'
  },
  supabase: {
    url: process.env.SUPABASE_URL || 'https://nkaafhuafausmcvzeanw.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rYWFmaHVhZmF1c21jdnplYW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjU1MDEsImV4cCI6MjA3MzEwMTUwMX0.KMW3hYzQIR1kzrnUoj5eftBO2x8tTaOjUnMkycfOCqE'
  }
};
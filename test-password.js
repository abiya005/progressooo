const bcrypt = require('bcryptjs');

async function testPassword() {
    const password = 'password123';
    const hash = '$2b$12$pr0iXv8nrJs.hy.VIBupNOQNqHAwrCNiisYInIzBDo.n6LaP1ceb6';
    
    console.log('Testing password:', password);
    console.log('Hash:', hash);
    
    const isValid = await bcrypt.compare(password, hash);
    console.log('Password valid:', isValid);
}

testPassword();


const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const secretKey = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here';

// Encrypt text
const encrypt = (text) => {
  if (!text) return '';
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, secretKey);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
};

// Decrypt text
const decrypt = (encryptedText) => {
  if (!encryptedText) return '';
  
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encrypted = textParts.join(':');
    
    const decipher = crypto.createDecipher(algorithm, secretKey);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
};

// Hash password (additional utility)
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// Generate random string
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

module.exports = {
  encrypt,
  decrypt,
  hashPassword,
  generateRandomString
};


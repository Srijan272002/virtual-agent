import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, copyFileSync } from 'fs';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define paths
const rootDir = join(__dirname, '..');
const templatePath = join(rootDir, 'env.template');
const envPath = join(rootDir, '.env.local');

// Check if .env.local already exists
if (existsSync(envPath)) {
  console.log('\x1b[33m%s\x1b[0m', '.env.local already exists. Skipping creation.');
  process.exit(0);
}

// Copy template to .env.local
try {
  copyFileSync(templatePath, envPath);
  console.log('\x1b[32m%s\x1b[0m', '.env.local created successfully!');
  console.log('\x1b[36m%s\x1b[0m', '\nNext steps:');
  console.log('1. Edit .env.local with your actual values');
  console.log('2. Get your Supabase credentials from https://supabase.com');
  console.log('3. Get your Gemini API key from https://makersuite.google.com/app/apikey');
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', 'Error creating .env.local:', error.message);
  process.exit(1);
} 
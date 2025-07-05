/**
 * Firebase Setup Check Script
 * 
 * This script helps diagnose common Firebase authentication issues.
 * Run it with: node scripts/check-firebase-setup.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = {};
      
      envContent.split('\n').forEach(line => {
        if (!line || line.startsWith('#') || line.startsWith('//')) return;
        const [key, value] = line.split('=');
        if (key && value) {
          envVars[key.trim()] = value.trim();
        }
      });
      
      return envVars;
    } else {
      console.error('No .env file found at:', envPath);
      return {};
    }
  } catch (err) {
    console.error('Error reading .env file:', err.message);
    return {};
  }
}

function openBrowser(url) {
  const command = process.platform === 'win32' ? 'start' :
                  process.platform === 'darwin' ? 'open' : 'xdg-open';
  try {
    execSync(`${command} ${url}`);
    return true;
  } catch (err) {
    console.error('Failed to open browser:', err.message);
    return false;
  }
}

function checkSetup() {
  console.log('\n========= FIREBASE AUTHENTICATION SETUP CHECK =========\n');
  
  // Load environment variables
  const envVars = loadEnvFile();
  
  // Check Firebase config
  const projectId = envVars.VITE_FIREBASE_PROJECT_ID;
  const messagingSenderId = envVars.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const authDomain = envVars.VITE_FIREBASE_AUTH_DOMAIN;
  
  console.log('Project ID:', projectId || 'Not found in .env');
  console.log('Messaging Sender ID:', messagingSenderId || 'Not found in .env');
  console.log('Auth Domain:', authDomain || 'Not found in .env');
  
  // Check if the project ID in the error message matches the messaging sender ID
  console.log('\n➡️ Checking for project number mismatch:');
  if (messagingSenderId === '927340828679') {
    console.log('⚠️  WARNING: Your messaging sender ID (927340828679) appears to match the project number in the error message.');
    console.log('   This suggests there is a mismatch between your project configuration and API enablement.');
  } else {
    console.log('✅ Your messaging sender ID does not match the project number in the error message.');
  }
  
  console.log('\n=============================================');
  console.log('\nTo fix the Identity Toolkit API error, you need to:');
  console.log('\n1. Enable the Google Identity Toolkit API for your project');
  console.log('2. Enable Google as an authentication provider in Firebase Console');
  console.log('3. Add localhost to authorized domains in Firebase Authentication settings');
  console.log('\n=============================================');
  
  rl.question('\nWould you like to open the Google Identity Toolkit API page? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y' && projectId) {
      const apiUrl = `https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=${projectId}`;
      console.log(`\nOpening: ${apiUrl}`);
      openBrowser(apiUrl);
      
      rl.question('\nWould you like to open the Firebase Authentication providers page too? (y/n): ', (answer2) => {
        if (answer2.toLowerCase() === 'y' && projectId) {
          const firebaseUrl = `https://console.firebase.google.com/project/${projectId}/authentication/providers`;
          console.log(`\nOpening: ${firebaseUrl}`);
          openBrowser(firebaseUrl);
          
          console.log('\n✅ After enabling the API and configuring the authentication provider:');
          console.log('1. Restart your development server');
          console.log('2. Try signing in with Google again');
          rl.close();
        } else {
          console.log(`\nYou can manually open: https://console.firebase.google.com/project/${projectId || 'YOUR_PROJECT_ID'}/authentication/providers`);
          rl.close();
        }
      });
    } else {
      console.log('\nYou can manually enable the Identity Toolkit API at:');
      console.log(`https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=${projectId || 'YOUR_PROJECT_ID'}`);
      rl.close();
    }
  });
}

// Run the check
checkSetup();

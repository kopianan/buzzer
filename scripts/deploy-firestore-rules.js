const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

async function deployFirestoreRules() {
  try {
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    
    console.log('🔥 Deploying Firestore rules to project:', projectId);
    
    // Read rules file
    const rulesContent = fs.readFileSync('./firestore.rules', 'utf8');
    console.log('\n📋 Rules content:');
    console.log('---');
    console.log(rulesContent);
    console.log('---\n');
    
    // Deploy rules via Firestore API
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default):updateSecurityRules`;
    
    const body = {
      rules: {
        rulesFiles: [
          {
            content: rulesContent,
            name: 'firestore.rules'
          }
        ]
      }
    };
    
    try {
      const res = await client.request({
        url,
        method: 'PATCH',
        data: body
      });
      
      console.log('✅ Firestore rules deployed successfully!');
      console.log('Response:', JSON.stringify(res.data, null, 2));
    } catch (apiErr) {
      console.error('❌ API Error:', apiErr.message);
      if (apiErr.response) {
        console.error('Status:', apiErr.response.status);
        console.error('Details:', JSON.stringify(apiErr.response.data, null, 2));
      }
      
      // Alternative: print manual deploy instructions
      console.log('\n📋 Manual Deploy Instructions:');
      console.log('1. Open https://console.firebase.google.com/project/' + projectId + '/firestore/rules');
      console.log('2. Replace the rules with the content below:');
      console.log('\n' + rulesContent);
      console.log('\n3. Click "Publish"');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deployFirestoreRules();

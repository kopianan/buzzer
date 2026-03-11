const { GoogleAuth } = require('google-auth-library');

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

async function getOAuthClients() {
  try {
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    
    console.log('🔥 Project ID:', projectId);
    console.log('');
    
    // List OAuth clients
    const url = `https://credentials.googleapis.com/v1/projects/${projectId}/oauthClients`;
    
    try {
      const res = await client.request({ url });
      console.log('✅ OAuth clients found:');
      console.log(JSON.stringify(res.data, null, 2));
    } catch (err) {
      console.log('❌ Error listing OAuth clients:', err.message);
      if (err.response) {
        console.log('Status:', err.response.status);
        console.log('Details:', JSON.stringify(err.response.data, null, 2));
      }
    }
    
    // Also try listing via Cloud Resource Manager
    console.log('');
    console.log('Checking API key...');
    const apiKeyUrl = `https://apikeys.googleapis.com/v2/projects/${projectId}/locations/global/keys`;
    
    try {
      const keyRes = await client.request({ url: apiKeyUrl });
      console.log('✅ API keys found:');
      console.log(JSON.stringify(keyRes.data, null, 2));
    } catch (err) {
      console.log('❌ Error listing API keys:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getOAuthClients();

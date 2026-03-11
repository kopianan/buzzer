const { GoogleAuth } = require('google-auth-library');

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

async function addMoreDomains() {
  try {
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    
    console.log('🔥 Project ID:', projectId);
    console.log('');
    
    // Get current config
    const getUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
    
    const getRes = await client.request({ url: getUrl });
    const currentConfig = getRes.data;
    
    console.log('Current authorized domains:', currentConfig.authorizedDomains || 'None');
    console.log('');
    
    // Add more domains
    const currentDomains = currentConfig.authorizedDomains || [];
    const newDomains = [...new Set([
      ...currentDomains,
      'localhost',
      '127.0.0.1',
      'buzzer-detector.firebaseapp.com',
      'buzzer-detector.web.app'
    ])];
    
    const updateBody = {
      ...currentConfig,
      authorizedDomains: newDomains
    };
    
    // Update config
    const patchRes = await client.request({
      url: getUrl,
      method: 'PATCH',
      data: updateBody
    });
    
    console.log('✅ Config updated successfully!');
    console.log('New authorized domains:', patchRes.data.authorizedDomains);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

addMoreDomains();

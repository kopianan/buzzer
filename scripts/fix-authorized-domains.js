const { GoogleAuth } = require('google-auth-library');

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

async function fixAuthorizedDomains() {
  try {
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    
    console.log('🔥 Project ID:', projectId);
    console.log('');
    
    // Get current config
    const getUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
    
    try {
      const getRes = await client.request({ url: getUrl });
      const currentConfig = getRes.data;
      
      console.log('✅ Current config retrieved');
      console.log('Current authorized domains:', currentConfig.authorizedDomains || 'None');
      console.log('');
      
      // Add localhost to authorized domains
      const currentDomains = currentConfig.authorizedDomains || [];
      const newDomains = [...new Set([...currentDomains, 'localhost'])];
      
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
      
    } catch (err) {
      console.log('❌ Error:', err.message);
      if (err.response) {
        console.log('Status:', err.response.status);
        console.log('Details:', JSON.stringify(err.response.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixAuthorizedDomains();

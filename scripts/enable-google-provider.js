const { GoogleAuth } = require('google-auth-library');

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

async function enableGoogleProvider() {
  try {
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    
    console.log('🔥 Project ID:', projectId);
    console.log('');
    
    // Get current config
    const getUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
    
    const getRes = await client.request({ url: getUrl });
    const currentConfig = getRes.data;
    
    console.log('Current signIn config:', JSON.stringify(currentConfig.signIn, null, 2));
    console.log('');
    
    // Enable anonymous sign in first (to test)
    const updateBody = {
      ...currentConfig,
      signIn: {
        ...currentConfig.signIn,
        anonymous: {
          enabled: true
        }
      }
    };
    
    // Update config
    const patchRes = await client.request({
      url: getUrl,
      method: 'PATCH',
      data: updateBody
    });
    
    console.log('✅ Config updated!');
    console.log('New signIn config:', JSON.stringify(patchRes.data.signIn, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

enableGoogleProvider();

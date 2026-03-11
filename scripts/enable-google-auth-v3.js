const { GoogleAuth } = require('google-auth-library');

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

async function enableGoogleAuth() {
  try {
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    
    console.log('🔥 Project ID:', projectId);
    console.log('Project Number: 161701263182');
    console.log('');
    
    // Coba enable via Identity Toolkit API v1
    // Enable Google as identity provider
    const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/identityPlatform:initialize`;
    
    try {
      const res = await client.request({
        url,
        method: 'POST'
      });
      console.log('✅ Identity Platform initialized');
      console.log(JSON.stringify(res.data, null, 2));
    } catch (initErr) {
      console.log('ℹ️  Identity Platform might already be initialized:', initErr.message);
    }
    
    // Now enable Google provider
    // Using the resource manager pattern
    const providerUrl = `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/identityPlatform/config`;
    
    const providerBody = {
      signIn: {
        email: {
          enabled: true,
          passwordRequired: true
        }
      },
      authorizedDomains: [
        'localhost',
        'buzzer-detector.firebaseapp.com',
        'buzzer-detector.web.app'
      ]
    };
    
    try {
      const res = await client.request({
        url: providerUrl,
        method: 'PATCH',
        data: providerBody
      });
      console.log('✅ Sign-in methods updated');
    } catch (patchErr) {
      console.log('⚠️  Could not update sign-in methods:', patchErr.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

enableGoogleAuth();

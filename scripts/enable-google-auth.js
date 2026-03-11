const { GoogleAuth } = require('google-auth-library');

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

async function enableGoogleAuth() {
  try {
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    
    console.log('🔥 Project ID:', projectId);
    console.log('');
    
    // Enable Google Identity Provider
    // First, enable Identity Toolkit API if not already
    console.log('📝 Mencoba enable Google Sign-in provider...');
    
    // Create/update the Google IDP config
    const url = `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/defaultSupportedIdpConfigs/google.com`;
    
    const body = {
      name: `projects/${projectId}/defaultSupportedIdpConfigs/google.com`,
      enabled: true,
      clientId: '', // Not needed for Google
      clientSecret: '' // Not needed for Google
    };
    
    try {
      // Try PATCH first (update if exists)
      const res = await client.request({
        url,
        method: 'PATCH',
        data: body
      });
      
      console.log('✅ Google Sign-in berhasil di-enable!');
      console.log('Response:', JSON.stringify(res.data, null, 2));
      
    } catch (patchError) {
      console.log('PATCH failed, trying PUT...');
      
      try {
        // Try PUT (create if not exists)
        const res = await client.request({
          url,
          method: 'PUT',
          data: body
        });
        
        console.log('✅ Google Sign-in berhasil di-enable!');
        console.log('Response:', JSON.stringify(res.data, null, 2));
        
      } catch (putError) {
        console.log('❌ Gagal enable via API:', putError.message);
        if (putError.response) {
          console.log('Status:', putError.response.status);
          console.log('Details:', JSON.stringify(putError.response.data, null, 2));
        }
        
        console.log('');
        console.log('📋 Silakan enable manual via Firebase Console:');
        console.log('1. Buka https://console.firebase.google.com/project/' + projectId + '/authentication/providers');
        console.log('2. Klik "Google"');
        console.log('3. Toggle switch ke "Enable"');
        console.log('4. Pilih email support');
        console.log('5. Klik "Save"');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

enableGoogleAuth();

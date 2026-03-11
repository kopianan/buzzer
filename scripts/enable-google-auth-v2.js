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
    
    // Coba pakai Firebase Management API v1beta1
    console.log('📝 Mencoba enable Google Sign-in provider...');
    
    // Get current config first
    const getUrl = `https://firebase.googleapis.com/v1beta1/projects/${projectId}`;
    
    try {
      const getRes = await client.request({ url: getUrl });
      console.log('✅ Project info ditemukan');
      console.log('Project name:', getRes.data.displayName);
      console.log('Project ID:', getRes.data.projectId);
      console.log('Project number:', getRes.data.projectNumber);
      console.log('');
      
      // Try to update auth config via Identity Toolkit
      const authUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
      
      const authBody = {
        signIn: {
          allowDuplicateEmails: false,
          hashConfig: {
            algorithm: 'BCRYPT'
          }
        },
        mfa: {
          state: 'DISABLED'
        }
      };
      
      try {
        const authRes = await client.request({
          url: authUrl,
          method: 'PATCH',
          data: authBody
        });
        console.log('✅ Auth config updated');
        console.log(JSON.stringify(authRes.data, null, 2));
      } catch (authErr) {
        console.log('⚠️  Could not update auth config via API:', authErr.message);
      }
      
    } catch (getError) {
      console.log('❌ Error getting project:', getError.message);
    }
    
    console.log('');
    console.log('📋 Alternatif: Enable manual via Firebase Console:');
    console.log('1. Buka https://console.firebase.google.com/project/' + projectId + '/authentication/providers');
    console.log('2. Klik "Google"');
    console.log('3. Toggle switch ke "Enable"');
    console.log('4. Pilih email support (contoh: ananalfredcarlos@gmail.com)');
    console.log('5. Klik "Save"');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

enableGoogleAuth();

const { GoogleAuth } = require('google-auth-library');

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

async function checkAuthProviders() {
  try {
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    
    console.log('🔥 Project ID:', projectId);
    console.log('');
    
    // Cek Identity Toolkit config (Firebase Auth)
    const url = `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/config`;
    
    try {
      const res = await client.request({ url });
      const config = res.data;
      
      console.log('✅ Firebase Auth Status:');
      console.log('   Email/Password enabled:', config.signIn?.email?.enabled || false);
      console.log('   Anonymous enabled:', config.signIn?.anonymous?.enabled || false);
      console.log('');
      
      // Check Identity Providers
      if (config.signIn?.identityPlatform?.identityProviders) {
        const providers = config.signIn.identityPlatform.identityProviders;
        console.log('📱 Identity Providers:');
        providers.forEach(p => {
          console.log('   -', p.name, p.enabled ? '(enabled)' : '(disabled)');
        });
      } else {
        console.log('⚠️  Belum ada Identity Providers yang dikonfigurasi');
        console.log('   Google Sign-in mungkin belum di-enable.');
      }
      
    } catch (apiError) {
      console.log('❌ Error accessing Identity Toolkit API:', apiError.message);
      if (apiError.response) {
        console.log('Status:', apiError.response.status);
        if (apiError.response.status === 403) {
          console.log('');
          console.log('ℹ️  Service account tidak punya permission untuk cek auth config.');
          console.log('   Tapi ini normal, kita bisa lanjut testing.');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAuthProviders();

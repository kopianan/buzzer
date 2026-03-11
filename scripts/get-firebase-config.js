const { GoogleAuth } = require('google-auth-library');

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

async function getFirebaseConfig() {
  try {
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    
    console.log('🔥 Project ID:', projectId);
    console.log('');
    
    // Coba ambil daftar web apps dari Firebase Management API
    const url = `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`;
    
    try {
      const res = await client.request({ url });
      const apps = res.data.apps || [];
      
      if (apps.length === 0) {
        console.log('⚠️  Belum ada Web App yang terdaftar di Firebase.');
        console.log('');
        console.log('📋 Instruksi untuk membuat Web App:');
        console.log('1. Buka https://console.firebase.google.com/project/' + projectId);
        console.log('2. Klik ikon gear (⚙️) > Project settings');
        console.log('3. Scroll ke bawah ke bagian "Your apps"');
        console.log('4. Klik icon </> (Web)');
        console.log('5. Masukkan nickname: "AmplifierScope"');
        console.log('6. Klik "Register app"');
        console.log('7. Copy config object yang muncul');
        console.log('');
        console.log('Atau alternatifnya, buat web app via Firebase CLI:');
        console.log('  firebase apps:create WEB --project ' + projectId);
      } else {
        console.log('✅ Ditemukan', apps.length, 'Web App(s):');
        console.log('');
        
        for (const app of apps) {
          console.log('App ID:', app.appId);
          console.log('Display Name:', app.displayName || 'N/A');
          console.log('');
          
          // Get detailed config
          const configUrl = `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps/${app.appId}/config`;
          try {
            const configRes = await client.request({ url: configUrl });
            const config = configRes.data;
            
            console.log('📋 Firebase Config:');
            console.log('-------------------');
            console.log('NEXT_PUBLIC_FIREBASE_API_KEY=' + config.apiKey);
            console.log('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=' + config.authDomain);
            console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID=' + config.projectId);
            console.log('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=' + config.storageBucket);
            console.log('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=' + config.messagingSenderId);
            console.log('NEXT_PUBLIC_FIREBASE_APP_ID=' + config.appId);
            console.log('-------------------');
          } catch (configError) {
            console.log('❌ Tidak bisa mengambil config:', configError.message);
          }
        }
      }
    } catch (apiError) {
      console.log('❌ Error accessing Firebase API:', apiError.message);
      if (apiError.response) {
        console.log('Status:', apiError.response.status);
        console.log('Details:', JSON.stringify(apiError.response.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getFirebaseConfig();

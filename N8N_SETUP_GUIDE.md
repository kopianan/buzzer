# 🔄 Setup n8n untuk AmplifierScope

## Overview
Workflow n8n untuk AI review komentar yang terdeteksi mencurigakan oleh Python service.

## 📋 Prerequisites
- Akun n8n (Cloud atau Self-hosted)
- API Key Anthropic (Claude) atau OpenAI
- Node.js 18+ (jika self-hosted)

---

## 🚀 Quick Start

### 1. Import Workflow

#### Opsi A: Import JSON File
1. Download `n8n-workflow-ai-review.json` dari repo ini
2. Buka n8n → Workflows → Import from File
3. Pilih file `n8n-workflow-ai-review.json`
4. Klik "Import"

#### Opsi B: Copy Paste (Jika import error)
1. Buat workflow baru
2. Tambahkan node sesuai urutan di bawah
3. Copy kode dari masing-masing node

---

## 🔧 Step-by-Step Setup

### Node 1: Webhook
```
Name: Webhook
Method: POST
Path: ai-review
Response Mode: Respond to Webhook (Last Node)
```

**Setelah save, copy Webhook URL:**
```
https://your-n8n.app.n8n.cloud/webhook/ai-review
```

Paste ke `.env.local`:
```bash
N8N_AI_WEBHOOK_URL=https://your-n8n.app.n8n.cloud/webhook/ai-review
```

---

### Node 2: Validate & Prep (Code Node)
```javascript
// Validate input
const input = $input.first().json;

if (!input.comments || !Array.isArray(input.comments)) {
  return [{
    json: {
      error: 'Invalid request: comments array required',
      ai_results: []
    }
  }];
}

// Filter only comments that need AI review
const commentsNeedingAI = input.comments.filter(c => c.needs_ai !== false);

if (commentsNeedingAI.length === 0) {
  return [{
    json: {
      ai_results: [],
      message: 'No comments need AI review',
      processed_at: new Date().toISOString()
    }
  }];
}

// Prepare data for AI
const context = input.context || {};

// Build prompt data
const promptData = commentsNeedingAI.map(c => ({
  no: c.no,
  username: c.username,
  text: c.comment_text?.substring(0, 200) || '(empty)',
  score: c.pre_score,
  flags: c.flags?.join(', ') || 'none',
  similarity: c.max_similarity || 0,
  in_spike: c.in_timing_spike || false,
  cluster: c.similarity_cluster_id || -1
}));

return [{
  json: {
    comments: commentsNeedingAI,
    promptData: promptData,
    context: {
      total: context.total_comments || commentsNeedingAI.length,
      clusters: context.clone_clusters || 0,
      spikes: context.timing_spikes || 0
    },
    batchCount: Math.ceil(commentsNeedingAI.length / 15)
  }
}];
```

---

### Node 3: Split Batches
```
Node: Split In Batches
Batch Size: 15
```

**Kenapa 15?**
- Balance: Tidak terlalu banyak token per call
- Speed: Tidak terlalu banyak API calls
- Cost: Optimal untuk Claude pricing

---

### Node 4: AI Agent (Anthropic Claude)

#### Setup Credentials:
1. Buka Settings → Credentials
2. Add Credential → Anthropic
3. Masukkan API Key dari https://console.anthropic.com
4. Save

#### Node Configuration:
```
Name: AI Claude
Model: claude-3-sonnet-20240229 (atau claude-3-haiku-20240307 untuk hemat)
Max Tokens: 2048
Temperature: 0.3
```

**System Message:**
```
Kamu adalah analis media sosial Indonesia yang ahli mendeteksi amplifier (akun yang memperkuat narasi secara terkoordinasi, juga dikenal sebagai buzzer).

TUGAS:
Review komentar yang sudah terdeteksi mencurigakan oleh sistem pattern-based dan tentukan:

1. TYPE (pilih satu):
   - amplifier: Akun terkoordinasi dengan pola kuat (clone + timing + generic username)
   - suspect: Mencurigakan tapi mungkin genuine
   - organic: Engagement genuine

2. SENTIMENT (pilih satu):
   - pro: Mendukung/menyetujui narasi
   - contra: Menolak/menyerang narasi
   - neutral: Netral/tanya-tanya
   - irrelevant: Tidak relevan/spam

3. CONFIDENCE: 0.0 - 1.0

4. REASONING: 1-2 kalimat penjelasan dalam Bahasa Indonesia

CATATAN PENTING:
- "Amplifier" adalah istilah netral untuk akun yang memperkuat narasi (buzzer)
- Bisa pro maupun kontra, tidak selalu negatif
- Fokus pada POLA PERILAKU, bukan isi konten
- Response HANYA dalam format JSON array
```

**User Message (Expression):**
```
Analisis {{ $json.promptData.length }} komentar berikut dari total {{ $('Validate & Prep').item.json.context.total }} komentar:

{{ JSON.stringify($json.promptData, null, 2) }}

Konteks Pola Terdeteksi:
- Clone Clusters: {{ $('Validate & Prep').item.json.context.clusters }}
- Timing Spikes: {{ $('Validate & Prep').item.json.context.spikes }}

Untuk setiap komentar, tentukan:
1. type: "amplifier", "suspect", atau "organic"
2. sentiment: "pro", "contra", "neutral", atau "irrelevant"
3. confidence: 0.0 - 1.0
4. reasoning: penjelasan singkat

Response dalam format JSON array:
[{"no": 1, "type": "amplifier", "sentiment": "pro", "confidence": 0.85, "reasoning": "Komentar copy-paste dengan timing spike"}]
```

---

### Node 5: Parse AI Response (Code Node)
```javascript
// Parse AI response
const aiResponse = $input.first().json.content || $input.first().json.message?.content || $input.first().json.text;

let parsedResults = [];
let parseError = null;

try {
  // Try to extract JSON array from response
  const jsonMatch = aiResponse.match(/\[[\s\S]*?\]/);
  const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
  parsedResults = JSON.parse(jsonStr);
  
  // Validate structure
  if (!Array.isArray(parsedResults)) {
    throw new Error('Response is not an array');
  }
  
  // Validate each result has required fields
  parsedResults = parsedResults.filter(r => {
    return r.no !== undefined && r.type && r.sentiment && r.confidence !== undefined;
  });
  
} catch (error) {
  parseError = error.message;
  console.error('Parse error:', error);
  console.error('Raw response:', aiResponse);
}

return [{
  json: {
    batch_results: parsedResults,
    count: parsedResults.length,
    error: parseError,
    raw_response: aiResponse.substring(0, 500) // Truncate for debug
  }
}];
```

---

### Node 6: Aggregate Batches
```
Node: Aggregate
Mode: Aggregate All Item Data
Field to Aggregate: batch_results
Field to Aggregate: count
Destination Field Name: all_batches
```

---

### Node 7: Merge Results (Code Node)
```javascript
// Merge all batch results
const allBatches = $input.first().json.all_batches || [];

let allResults = [];
let totalCount = 0;

for (const batch of allBatches) {
  if (batch.batch_results && Array.isArray(batch.batch_results)) {
    allResults.push(...batch.batch_results);
    totalCount += batch.count || 0;
  }
}

// Deduplicate by 'no' (keep last)
const uniqueMap = new Map();
for (const result of allResults) {
  uniqueMap.set(result.no, result);
}
const uniqueResults = Array.from(uniqueMap.values());

return [{
  json: {
    ai_results: uniqueResults,
    total_reviewed: uniqueResults.length,
    ai_model: 'claude-3-sonnet-20240229',
    processed_at: new Date().toISOString(),
    batches_processed: allBatches.length
  }
}];
```

---

### Node 8: Respond to Webhook
```
Node: Respond to Webhook
Respond With: {{ $json }}
Status Code: 200
```

---

## 🧪 Testing

### Test dengan curl:
```bash
curl -X POST https://your-n8n.app.n8n.cloud/webhook/ai-review \
  -H "Content-Type: application/json" \
  -d '{
    "comments": [
      {
        "no": 1,
        "username": "user123",
        "comment_text": "Keren banget 🔥🔥🔥",
        "pre_score": 45,
        "flags": ["copy-paste", "timing-spike"],
        "max_similarity": 0.85,
        "in_timing_spike": true,
        "similarity_cluster_id": 5
      }
    ],
    "context": {
      "post_url": "https://instagram.com/p/ABC123",
      "total_comments": 507,
      "clone_clusters": 10,
      "timing_spikes": 2
    }
  }'
```

### Expected Response:
```json
{
  "ai_results": [
    {
      "no": 1,
      "type": "amplifier",
      "sentiment": "pro",
      "confidence": 0.82,
      "reasoning": "Komentar copy-paste dengan timing spike dan emoji repetition"
    }
  ],
  "total_reviewed": 1,
  "ai_model": "claude-3-sonnet-20240229",
  "processed_at": "2026-03-09T12:00:00.000Z",
  "batches_processed": 1
}
```

---

## 💰 Estimasi Biaya

### Claude Pricing (per 1K tokens)
| Model | Input | Output |
|-------|-------|--------|
| claude-3-haiku | $0.25 | $1.25 |
| claude-3-sonnet | $3.00 | $15.00 |
| claude-3-opus | $15.00 | $75.00 |

### Per Analisis (50 komentar → ~3 batches)
| Model | Estimasi Biaya |
|-------|----------------|
| Haiku | ~$0.15 - $0.30 |
| Sonnet | ~$0.50 - $1.00 |
| Opus | ~$2.00 - $4.00 |

**Rekomendasi:** Gunakan **Haiku** untuk development/testing, **Sonnet** untuk production.

---

## 🔧 Troubleshooting

### Error: "Invalid request: comments array required"
- Pastikan request body punya field `comments` yang merupakan array
- Cek Content-Type header: `application/json`

### Error: "No comments need AI review"
- Semua komentar sudah ter-review atau tidak ada yang `needs_ai: true`
- Cek field `needs_ai` di komentar

### Parse Error dari AI
- AI mungkin return format tidak valid
- Cek execution log untuk raw response
- Coba adjust temperature ke 0.1 untuk lebih konsisten

### Timeout Error
- Default timeout: 120 detik
- Jika banyak komentar (>100), naikkan timeout di Web App
- Atau kurangi batch size (dari 15 jadi 10)

---

## 📊 Monitoring

### Cek Execution History:
1. Buka n8n → Executions
2. Lihat status setiap run
3. Klik untuk detail input/output tiap node

### Enable Error Workflow:
1. Buat workflow baru untuk error handling
2. Settings → Error Workflow → Pilih workflow error handler
3. Workflow error akan kirim notifikasi (email/Slack/Telegram)

---

## 🎨 Alternatif: OpenAI (GPT)

Jika ingin pakai OpenAI instead of Claude:

1. Ganti Node 4 dari "Anthropic Chat Model" → "OpenAI Chat Model"
2. Setup OpenAI API Key di Credentials
3. Ganti model: `gpt-4o-mini` (hemat) atau `gpt-4o` (akurat)
4. System message dan user message tetap sama

**Pricing OpenAI (per 1K tokens):**
- gpt-4o-mini: $0.15 input, $0.60 output
- gpt-4o: $5.00 input, $15.00 output

---

## ✅ Checklist Deployment

- [ ] Import workflow ke n8n
- [ ] Setup credentials (Anthropic/OpenAI)
- [ ] Copy Webhook URL
- [ ] Paste ke `.env.local` (N8N_AI_WEBHOOK_URL)
- [ ] Test dengan curl
- [ ] Jalankan Web App dan test full flow
- [ ] Monitor executions

---

## 🆘 Support

Jika ada issue:
1. Cek n8n execution logs
2. Test dengan payload simple (1 komentar)
3. Cek rate limit API key
4. Pastikan API key masih valid dan ada credit

Selamat menggunakan! 🚀
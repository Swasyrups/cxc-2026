/**
 * CxC 2026 — Voice Submission Assistant
 * v2: MediaRecorder + Whisper transcription (works on iOS, Android, desktop)
 */

const SWA_SYRUPS = [
  'Alphonso Mango', 'Guava Chilli', 'Brown Butter', 'Roasted Hazelnut',
  'Passionfruit', "Pineapple Bird's Eye"
];

const SPIRITS = [
  'Gin', 'Rum', 'Vodka', 'Whisky', 'Tequila', 'Mezcal',
  'Brandy / Cognac', 'Aperol / Campari', 'Amaro', 'Non-alcoholic', 'Other'
];


const SUPABASE_FN_BASE = 'https://ftduvppcdjanupoudzvi.supabase.co/functions/v1';
const VOICE_ASSIST_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZHV2cHBjZGphbnVwb3VkenZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NDcwNTMsImV4cCI6MjA5NzQyMzA1M30.HibCpa3_CKojK-hUw5b0PGI6UK8LKdOVI0KUxXZn82w';

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordStartTime = 0;

function initVoiceAssist() {
  const formCard = document.querySelector('#submitForm .form-card');
  if (!formCard) return;

  const voiceBar = document.createElement('div');
  voiceBar.id = 'voiceAssistBar';
  voiceBar.style.cssText = `
    background: linear-gradient(135deg, #59751d, #4b3141);
    border-radius: 16px;
    padding: 20px 24px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  `;
  voiceBar.innerHTML = `
    <div style="flex:1;min-width:200px;">
      <p style="color:#fff;font-family:'Poppins',sans-serif;font-weight:600;margin:0 0 4px;">🎤 Fill Recipe by Voice</p>
      <p style="color:rgba(255,255,255,0.7);font-family:'Poppins',sans-serif;font-size:0.82rem;margin:0;">
        Describe your drink name, syrup, spirit, ingredients, steps, garnish, glassware, and story.
      </p>
    </div>
    <button id="voiceBtn" onclick="toggleRecording()" style="
      background:#f0567a;color:#fff;border:none;border-radius:50px;
      padding:12px 24px;font-size:0.9rem;font-weight:600;
      font-family:'Poppins',sans-serif;cursor:pointer;white-space:nowrap;
    ">🎤 Start Speaking</button>
    <div id="voiceStatus" style="
      width:100%;font-family:'Poppins',sans-serif;font-size:0.82rem;
      color:rgba(255,255,255,0.8);display:none;
    "></div>
  `;

  document.getElementById('submitForm').insertBefore(voiceBar, formCard);
}

function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

async function startRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Voice input is not supported in this browser. Please fill the form manually.');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Pick a mime type the device actually supports
    const mimeType = pickSupportedMimeType();
    mediaRecorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
      handleRecordingComplete();
    };

    mediaRecorder.start();
    recordStartTime = Date.now();
    isRecording = true;

    document.getElementById('voiceBtn').textContent = '⏹ Stop & Fill Form';
    document.getElementById('voiceBtn').style.background = '#e53e3e';
    document.getElementById('voiceStatus').style.display = 'block';
    setVoiceStatus('🎙️ Recording... speak your recipe details.');

  } catch (err) {
    console.error('Mic access error:', err);
    if (err.name === 'NotAllowedError') {
      setVoiceStatus('Microphone permission denied. Please allow mic access and try again.');
    } else {
      setVoiceStatus('Could not access microphone. Please fill manually.');
    }
  }
}

function pickSupportedMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg;codecs=opus'
  ];
  for (const type of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return null; // let browser pick default
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

  const elapsed = Date.now() - recordStartTime;
  if (elapsed < 800) {
    // too short — likely accidental tap, avoid empty/garbage upload
    mediaRecorder.stop();
    isRecording = false;
    resetVoiceButton();
    setVoiceStatus('Recording too short. Please try again and speak for a few seconds.');
    return;
  }

  mediaRecorder.stop();
  isRecording = false;
  resetVoiceButton();
  setVoiceStatus('⏳ Uploading & transcribing your recipe...');
}

function resetVoiceButton() {
  document.getElementById('voiceBtn').textContent = '🎤 Start Speaking';
  document.getElementById('voiceBtn').style.background = '#f0567a';
}

async function handleRecordingComplete() {
  if (!audioChunks.length) {
    setVoiceStatus('No audio captured. Please try again.');
    return;
  }

  const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });

  if (audioBlob.size < 1000) {
    setVoiceStatus('No speech detected. Please try again.');
    return;
  }

  try {
    const transcript = await transcribeAudio(audioBlob);
    if (!transcript || !transcript.trim()) {
      setVoiceStatus('No speech detected. Please try again.');
      return;
    }
    await extractAndFill(transcript.trim());
  } catch (err) {
    console.error('Transcription error:', err);
    if (err.message === 'TIMEOUT') {
      setVoiceStatus('Transcription took too long. Please try a shorter recording (under 60s).');
    } else {
      setVoiceStatus('Could not process. Please fill manually or try again.');
    }
  }
}

async function transcribeAudio(audioBlob) {
  const formData = new FormData();
  const ext = (mediaRecorder.mimeType || '').includes('mp4') ? 'mp4' : 'webm';
  formData.append('audio', audioBlob, `recording.${ext}`);

  const response = await fetch(`${SUPABASE_FN_BASE}/whisper-transcribe`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOICE_ASSIST_KEY}`
    },
    body: formData
  });

  if (!response.ok) {
    if (response.status === 504) {
      throw new Error('TIMEOUT');
    }
    const errText = await response.text().catch(() => '');
    throw new Error(`Transcribe failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.text || '';
}

async function extractAndFill(transcript) {
  const prompt = `Extract recipe submission details from this spoken description and return ONLY valid JSON, no markdown, no explanation. Extract ONLY what the speaker explicitly says. Do not add adjectives, embellishments, or creative interpretation. Preserve their exact words and phrasing. If they say inspired by my grandmothers kitchen, write exactly that.

Spoken description: "${transcript}"

Valid Swa syrup options (match spoken syrup names to these exactly, only include if mentioned): ${SWA_SYRUPS.join(', ')}
Valid spirit options (match spoken spirit names to these exactly, only include if mentioned): ${SPIRITS.join(', ')}

Return this exact JSON structure:
{
  "drinkName": "name of the drink, or empty string if not mentioned",
  "swaSyrups": ["exact matches from the valid Swa syrup options list, only if mentioned"],
  "spirits": ["exact matches from the valid spirit options list, only if mentioned"],
  "ingredients": "full ingredients list with measurements, one per line",
  "garnish": "garnish description or empty string",
  "glassware": "glassware type or empty string",
  "recipeSteps": "the steps describing HOW the drink was made — the actual procedure/process, in the speaker's own words, one step per line if possible.",
  "recipeNotes": "the story or inspiration behind the drink, in the speaker's own words — NOT the preparation process (that goes in recipeSteps). Empty string if no story was mentioned.",
  "homemade": [
    {
      "name": "component name",
      "type": "one of: Syrup / Cordial, Infusion, Bitter, Fat Wash, Juice, Other",
      "recipe": "how to make it"
    }
  ]
}

If no homemade components are mentioned, return empty array for homemade.
Keep ingredients formatted with one ingredient per line with measurements.`;

  try {
    const response = await fetch(`${SUPABASE_FN_BASE}/claude-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOICE_ASSIST_KEY}`
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content[0].text.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    fillFields(parsed);
    setVoiceStatus('✓ Form filled! Please review and edit as needed.');
    resetVoiceButton();
    document.getElementById('voiceBtn').textContent = '🎤 Speak Again';

  } catch (err) {
    console.error('Voice assist error:', err);
    setVoiceStatus('Could not process. Please fill manually or try again.');
  }
}

function fillFields(data) {
  if (data.drinkName) document.getElementById('drinkName').value = data.drinkName;
  if (data.ingredients) document.getElementById('ingredients').value = data.ingredients;
  if (data.garnish) document.getElementById('garnish').value = data.garnish;
  if (data.glassware) document.getElementById('glassware').value = data.glassware;
  if (data.recipeSteps) document.getElementById('recipeSteps').value = data.recipeSteps;
  if (data.recipeNotes) document.getElementById('recipeNotes').value = data.recipeNotes;

  if (data.swaSyrups && data.swaSyrups.length > 0) {
    checkMultiSelectOptions('swaSyrupWrap', data.swaSyrups);
  }

  if (data.spirits && data.spirits.length > 0) {
    checkMultiSelectOptions('spiritWrap', data.spirits);
  }

  if (data.homemade && data.homemade.length > 0) {
    const list = document.getElementById('homemadeList');
    list.innerHTML = '';
    data.homemade.forEach((item) => {
      addHomemade();
      const items = list.querySelectorAll('.homemade-item');
      const el = items[items.length - 1];
      if (el) {
        const nameInput = el.querySelector('input.form-input');
        const typeSelect = el.querySelector('select.form-select');
        const recipeTextarea = el.querySelector('textarea.form-textarea');
        if (nameInput) nameInput.value = item.name || '';
        if (typeSelect) typeSelect.value = item.type || '';
        if (recipeTextarea) recipeTextarea.value = item.recipe || '';
      }
    });
  }
}

function checkMultiSelectOptions(wrapId, valuesToCheck) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  const lowerValues = valuesToCheck.map(v => v.toLowerCase());
  wrap.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (lowerValues.includes(cb.value.toLowerCase())) {
      cb.checked = true;
    }
  });
  if (typeof updateMultiDisplay === 'function') updateMultiDisplay(wrapId);
}

function setVoiceStatus(msg) {
  const el = document.getElementById('voiceStatus');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

document.addEventListener('DOMContentLoaded', initVoiceAssist);

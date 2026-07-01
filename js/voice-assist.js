/**
 * CxC 2026 — Voice Submission Assistant
 */

const SWA_SYRUPS = [
  'Alphonso Mango', 'Guava Chilli', 'Brown Butter', 'Roasted Hazelnut',
  'Buransh', "Pineapple Bird's Eye", 'Kokam', 'Jamun', 'Nannari',
  'Rose', 'Tamarind', 'Lemongrass'
];

const SPIRITS = [
  'Gin', 'Rum', 'Vodka', 'Whisky', 'Tequila', 'Mezcal',
  'Brandy / Cognac', 'Aperol / Campari', 'Amaro', 'Non-alcoholic', 'Other'
];

const METHODS = ['Shake', 'Stir', 'Blend', 'Build', 'Pour-over', 'Cold brew', 'Other'];

let recognition = null;
let isRecording = false;
let fullTranscript = '';

function initVoiceAssist() {
  // Add voice button to form
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
        Describe your ingredients, garnish, glassware, recipe story, and any homemade components.
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

function startRecording() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('Voice input is not supported in this browser. Please use Chrome.');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-IN';

  fullTranscript = '';

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        fullTranscript += event.results[i][0].transcript + ' ';
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    document.getElementById('voiceStatus').textContent = '🎙️ ' + (fullTranscript + interim).slice(-120) + '...';
  };

  recognition.onerror = (e) => {
    setVoiceStatus('Error: ' + e.error + '. Please try again.');
    stopRecording();
  };

  recognition.start();
  isRecording = true;
  document.getElementById('voiceBtn').textContent = '⏹ Stop & Fill Form';
  document.getElementById('voiceBtn').style.background = '#e53e3e';
  document.getElementById('voiceStatus').style.display = 'block';
  setVoiceStatus('🎙️ Listening... speak your recipe details.');
}

function stopRecording() {
  if (recognition) recognition.stop();
  isRecording = false;
  document.getElementById('voiceBtn').textContent = '🎤 Start Speaking';
  document.getElementById('voiceBtn').style.background = '#f0567a';
  setVoiceStatus('⏳ Processing your recipe...');
  if (fullTranscript.trim()) {
    extractAndFill(fullTranscript.trim());
  } else {
    setVoiceStatus('No speech detected. Please try again.');
  }
}

async function extractAndFill(transcript) {
  const prompt = `Extract recipe submission details from this spoken description and return ONLY valid JSON, no markdown, no explanation.Extract ONLY what the speaker explicitly says. Do not add adjectives, embellishments, or creative interpretation. Preserve their exact words and phrasing. If they say inspired by my grandmothers kitchen, write exactly that.

Spoken description: "${transcript}"

Return this exact JSON structure:
{
  "ingredients": "full ingredients list with measurements, one per line",
  "garnish": "garnish description or empty string",
  "glassware": "glassware type or empty string",
  "recipeNotes": "story/inspiration/notes or empty string",
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
    const response = await fetch('https://ftduvppcdjanupoudzvi.supabase.co/functions/v1/claude-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZHV2cHBjZGphbnVwb3VkenZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NDcwNTMsImV4cCI6MjA5NzQyMzA1M30.HibCpa3_CKojK-hUw5b0PGI6UK8LKdOVI0KUxXZn82w`
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
    document.getElementById('voiceBtn').textContent = '🎤 Speak Again';

  } catch (err) {
    console.error('Voice assist error:', err);
    setVoiceStatus('Could not process. Please fill manually or try again.');
  }
}

function fillFields(data) {
  if (data.ingredients) document.getElementById('ingredients').value = data.ingredients;
  if (data.garnish) document.getElementById('garnish').value = data.garnish;
  if (data.glassware) document.getElementById('glassware').value = data.glassware;
  if (data.recipeNotes) document.getElementById('recipeNotes').value = data.recipeNotes;

  if (data.homemade && data.homemade.length > 0) {
    // Clear existing homemade items
    const list = document.getElementById('homemadeList');
    list.innerHTML = '';
    data.homemade.forEach((item, i) => {
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

function setVoiceStatus(msg) {
  const el = document.getElementById('voiceStatus');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

document.addEventListener('DOMContentLoaded', initVoiceAssist);

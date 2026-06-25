/**
 * CxC 2026 — Registration Form Handler
 */

const SUPABASE_URL      = 'https://ftduvppcdjanupoudzvi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZHV2cHBjZGphbnVwb3VkenZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NDcwNTMsImV4cCI6MjA5NzQyMzA1M30.HibCpa3_CKojK-hUw5b0PGI6UK8LKdOVI0KUxXZn82w';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Places state ──────────────────────────────────────────────────────────────
const SHIPPING_CITIES = [
  'delhi', 'new delhi', 'mumbai', 'bombay', 'bangalore', 'bengaluru',
  'jaipur', 'jodhpur', 'chandigarh', 'amritsar', 'ludhiana',
  'goa', 'panaji', 'pune', 'surat', 'ahmedabad', 'nagpur',
  'hyderabad', 'chennai', 'madras', 'kochi', 'cochin',
  'mysore', 'mysuru', 'coimbatore'
];

let cityValid = false;
let employerChecked = false;
let couponValid = false;
let couponCode = '';

// ── Google Places init (called by Maps script callback) ───────────────────────
function initPlaces() {
  document.getElementById('city-error').style.display = 'none';

  // ── Employer autocomplete ──
  const employerInput = document.getElementById('employer');
  if (employerInput) {
    const empAC = new google.maps.places.Autocomplete(employerInput, {
      types: ['establishment'],
      componentRestrictions: { country: 'in' },
      fields: ['name', 'formatted_address', 'place_id']
    });
    empAC.addListener('place_changed', () => {
      const place = empAC.getPlace();
      const errEl = document.getElementById('employer-error');
      if (place.place_id) {
        employerInput.value = place.name;
        document.getElementById('employer_address').value = place.formatted_address || '';
        errEl.style.display = 'none';
        employerChecked = true;
      } else {
        errEl.innerHTML = 'We couldn\'t verify this venue. Please email <a href="mailto:cxc@drinkswa.com" style="color:var(--olive)">cxc@drinkswa.com</a>.';
        errEl.style.display = 'block';
        employerChecked = false;
      }
    });
  }

  // ── Address autocomplete ──
  const addr1Input = document.getElementById('addr1');
  if (addr1Input) {
    const addrAC = new google.maps.places.Autocomplete(addr1Input, {
      types: ['geocode'],
      componentRestrictions: { country: 'in' },
      fields: ['address_components', 'formatted_address']
    });
    addrAC.addListener('place_changed', () => {
      const place = addrAC.getPlace();
      const components = place.address_components || [];

      let locality = '', level2 = '', pincode = '', state = '';

      components.forEach(c => {
        if (c.types.includes('locality')) locality = c.long_name;
        if (c.types.includes('administrative_area_level_2')) level2 = c.long_name;
        if (c.types.includes('postal_code')) pincode = c.long_name;
        if (c.types.includes('administrative_area_level_1')) state = c.long_name;
      });

      const CITY_ALIASES = {
        'bangalore urban': 'Bangalore',
        'bengaluru urban': 'Bengaluru',
        'mumbai suburban': 'Mumbai',
        'delhi district': 'Delhi',
        'south goa': 'Goa',
        'north goa': 'Goa',
        'gautam buddha nagar': 'Delhi',
        'gurugram': 'Delhi',
        'faridabad': 'Delhi',
        'ghaziabad': 'Delhi',
      };

      let rawCity = locality || level2;
      const city = CITY_ALIASES[rawCity.toLowerCase()] || rawCity;

      const toCheck = [locality, level2, city].map(s => s.toLowerCase());
      cityValid = toCheck.some(s => SHIPPING_CITIES.some(sc => s.includes(sc) || sc.includes(s)));

      if (city) document.getElementById('city').value = city;
      if (pincode) document.getElementById('pincode').value = pincode;
      if (state) {
        const stateSelect = document.getElementById('state');
        for (let opt of stateSelect.options) {
          if (opt.value.toLowerCase() === state.toLowerCase()) {
            stateSelect.value = opt.value;
            break;
          }
        }
      }

      document.getElementById('city-error').style.display = cityValid ? 'none' : 'block';
    });
  }
}

// ── Form init ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  if (!form) return;

  // ── Coupon blur validation ──
  const couponInput = document.getElementById('couponCode');
  if (couponInput) {
    couponInput.addEventListener('blur', async () => {
      const code = couponInput.value.trim().toUpperCase();
      const statusEl = document.getElementById('coupon-status');
      if (!code) {
        statusEl.style.display = 'none';
        couponValid = false;
        couponCode = '';
        return;
      }

      const { data, error } = await sb
        .from('coupons')
        .select('code, type, max_uses, used_count, active')
        .eq('code', code)
        .single();

      if (error || !data || !data.active || data.used_count >= data.max_uses) {
        statusEl.textContent = '✗ Invalid or expired coupon code.';
        statusEl.style.color = '#e53e3e';
        statusEl.style.display = 'block';
        couponValid = false;
        couponCode = '';
      } else {
        statusEl.textContent = '✓ Coupon applied — free registration!';
        statusEl.style.color = '#38a169';
        statusEl.style.display = 'block';
        couponValid = true;
        couponCode = code;
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleRegistration(form);
  });
});

async function handleRegistration(form) {
  const btn = form.querySelector('button[type="submit"]');

  const data = {
    first_name:       form.firstName.value.trim(),
    last_name:        form.lastName.value.trim(),
    email:            form.email.value.trim().toLowerCase(),
    phone:            form.whatsapp.value.trim(),
    role:             form.role.value,
    employer:         form.employer.value.trim(),
    employer_address: form.employer_address.value.trim() || null,
    address_line_1:   form.addr1.value.trim(),
    address_line_2:   form.addr2.value.trim() || null,
    city:             form.city.value.trim(),
    pincode:          form.pincode.value.trim(),
    state:            form.state.value.trim(),
  };

  const errors = validate(data);
  if (errors.length) { showErrors(form, errors); return; }

  setLoading(btn, true);
  clearErrors(form);

  try {
    const tempPassword = crypto.randomUUID();

    const { data: authData, error: authError } = await sb.auth.signUp({
      email:    data.email,
      password: tempPassword,
      options:  { data: { first_name: data.first_name, last_name: data.last_name } }
    });

    console.log('authData:', authData);
    console.log('authError:', authError);

    if (authError) {
      showFormError(form, authError.message.includes('already registered')
        ? 'This email is already registered.'
        : authError.message);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const status = couponValid ? 'registered' : 'pending_payment';

    const { error: dbError } = await sb
      .from('participants')
      .insert({
        auth_user_id: authData.user?.id,
        ...data,
        status,
        coupon_code: couponCode || null
      });

    if (dbError) {
      showFormError(form, dbError.code === '23505'
        ? 'This email is already registered.'
        : 'Something went wrong. Email cxc@drinkswa.com');
      console.error('DB error:', dbError);
      return;
    }

    if (couponValid) {
      // Mark coupon used
      const { data: couponData } = await sb
        .from('coupons')
        .select('used_count, used_by')
        .eq('code', couponCode)
        .single();

      await sb.from('coupons')
        .update({
          used_count: (couponData.used_count || 0) + 1,
          used_by: [...(couponData.used_by || []), data.email]
        })
        .eq('code', couponCode);

      showSuccess(form, data.first_name, data, true);
    } else {
      // Show Razorpay
      form.style.display = 'none';
      document.getElementById('razorpay-wrapper').style.display = 'block';
    }

  } catch (err) {
    console.error('Registration error:', err);
    showFormError(form, 'Unexpected error. Please try again.');
  } finally {
    setLoading(btn, false);
  }
}

function validate(data) {
  const errors = [];
  if (!data.first_name) errors.push({ field: 'firstName', msg: 'First name is required' });
  if (!data.last_name)  errors.push({ field: 'lastName',  msg: 'Last name is required' });
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.push({ field: 'email', msg: 'Valid email is required' });
  if (!data.phone || !/^\d{10}$/.test(data.phone.replace(/\D/g, '')))
    errors.push({ field: 'whatsapp', msg: 'Valid 10-digit phone number required' });
  if (!data.employer) errors.push({ field: 'employer', msg: 'Please enter your current employer or venue' });
  if (!employerChecked) errors.push({ field: 'employer', msg: 'Please select your venue from the dropdown suggestions.' });
  if (!data.role)   errors.push({ field: 'role',    msg: 'Please select your role' });
  if (!data.address_line_1) errors.push({ field: 'addr1', msg: 'Shipping address is required' });
  if (!data.city)           errors.push({ field: 'city',  msg: 'City is required' });
  if (!cityValid)           errors.push({ field: 'city',  msg: 'We don\'t ship to this city. Please use an address in one of our shipping cities.' });
  if (!data.pincode || !/^\d{6}$/.test(data.pincode))
    errors.push({ field: 'pincode', msg: 'Valid 6-digit pincode required' });
  if (!data.state) errors.push({ field: 'state', msg: 'State is required' });
  return errors;
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Registering...' : 'Submit Form →';
}

function showErrors(form, errors) {
  errors.forEach(({ field, msg }) => {
    const input = form.querySelector(`#${field}`);
    if (!input) return;
    input.classList.add('input-error');
    let errEl = input.parentNode.querySelector('.field-error');
    if (!errEl) {
      errEl = document.createElement('span');
      errEl.className = 'field-error';
      input.parentNode.appendChild(errEl);
    }
    errEl.textContent = msg;
  });
}

function clearErrors(form) {
  form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  form.querySelectorAll('.field-error').forEach(el => el.remove());
  form.querySelectorAll('.form-error-banner').forEach(el => el.remove());
}

function showFormError(form, msg) {
  let banner = form.querySelector('.form-error-banner');
  if (!banner) {
    banner = document.createElement('p');
    banner.className = 'form-error-banner';
    form.querySelector('button[type="submit"]').before(banner);
  }
  banner.innerHTML = msg;
}

function showSuccess(form, firstName, data, freeCoupon = false) {
  if (typeof gtag === 'function') {
    gtag('event', 'registration_complete', {
      method: 'cxc_form',
      role:   data.role,
    });
  }
  if (typeof fbq === 'function') {
    fbq('track', 'Purchase', {
      content_name:     'CxC 2026 Registration',
      content_category: data.role,
      value:            freeCoupon ? 0 : 99,
      currency:         'INR',
    });
  }

  const card = form.closest('.register-form-card');
  card.innerHTML = `
    <div class="reg-success">
      <div class="reg-success-icon">✓</div>
      <h3>You're in, ${firstName}!</h3>
      <p>Your registration is confirmed. Your Swa sample pack will be shipped within 24 hours.</p>
      <p>Check your email for confirmation. The submission portal opens <strong>25 July 2026</strong>.</p>
      <a href="https://www.instagram.com/swa.artisanalsyrups/" target="_blank" class="form-submit" style="display:inline-block;text-decoration:none;">
        Follow @swa.artisanalsyrups →
      </a>
    </div>
  `;
}
/**
 * LeadForge — Page Generator
 * Netlify Serverless Function
 *
 * POST /api/generate
 * Receives intake form data, calls Claude API,
 * returns a complete lead magnet HTML page as a string.
 *
 * SETUP:
 *   1. In Netlify dashboard → Site settings → Environment variables
 *   2. Add variable: ANTHROPIC_API_KEY = your key from console.anthropic.com
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-6';

/* ── CORS headers ── */
const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

/* ── Smart field lookup by vertical ── */
const SMART_FIELDS = {
  photography: `
    <div class="form-row">
      <label>Type of session <span class="req">*</span></label>
      <select name="session_type" required>
        <option value="" disabled selected>Select a session type</option>
        <option value="wedding">Wedding photography</option>
        <option value="engagement">Engagement session</option>
        <option value="portrait">Portrait session</option>
        <option value="family">Family portraits</option>
        <option value="brand">Brand / commercial</option>
        <option value="event">Event photography</option>
        <option value="maternity">Maternity / newborn</option>
        <option value="other">Something else</option>
      </select>
    </div>
    <div class="form-row-2">
      <div>
        <label>Preferred date</label>
        <input type="text" name="preferred_date" placeholder="e.g. June 2025">
      </div>
      <div>
        <label>Approximate budget</label>
        <select name="budget">
          <option value="" disabled selected>Select range</option>
          <option value="under_500">Under $500</option>
          <option value="500_1000">$500 – $1,000</option>
          <option value="1000_2500">$1,000 – $2,500</option>
          <option value="2500_5000">$2,500 – $5,000</option>
          <option value="5000_plus">$5,000+</option>
          <option value="unsure">Not sure yet</option>
        </select>
      </div>
    </div>`,

  education: `
    <div class="form-row-2">
      <div>
        <label>Child's age <span class="req">*</span></label>
        <select name="child_age" required>
          <option value="" disabled selected>Select age</option>
          <option value="5-7">5 – 7 years</option>
          <option value="8-10">8 – 10 years</option>
          <option value="11-13">11 – 13 years</option>
          <option value="14-17">14 – 17 years</option>
          <option value="adult">Adult learner</option>
        </select>
      </div>
      <div>
        <label>Current grade / level</label>
        <input type="text" name="grade_level" placeholder="e.g. Grade 6">
      </div>
    </div>
    <div class="form-row">
      <label>Subject / area of focus</label>
      <input type="text" name="subject" placeholder="e.g. Math, Chess, Reading">
    </div>
    <div class="form-row">
      <label>Preferred session format</label>
      <select name="session_format">
        <option value="" disabled selected>Select format</option>
        <option value="online">Online</option>
        <option value="in_person">In-person</option>
        <option value="either">Either works</option>
      </select>
    </div>`,

  home_services: `
    <div class="form-row">
      <label>Type of service needed <span class="req">*</span></label>
      <select name="service_type" required>
        <option value="" disabled selected>Select service</option>
        <option value="repair">Repair / fix</option>
        <option value="installation">Installation</option>
        <option value="maintenance">Maintenance / inspection</option>
        <option value="renovation">Renovation / remodel</option>
        <option value="emergency">Emergency / urgent</option>
        <option value="other">Other</option>
      </select>
    </div>
    <div class="form-row-2">
      <div>
        <label>Property type</label>
        <select name="property_type">
          <option value="" disabled selected>Select type</option>
          <option value="house">House</option>
          <option value="condo">Condo / apartment</option>
          <option value="commercial">Commercial</option>
        </select>
      </div>
      <div>
        <label>Urgency</label>
        <select name="urgency">
          <option value="" disabled selected>Select urgency</option>
          <option value="asap">As soon as possible</option>
          <option value="this_week">This week</option>
          <option value="flexible">I'm flexible</option>
        </select>
      </div>
    </div>`,

  legal: `
    <div class="form-row">
      <label>Area of law <span class="req">*</span></label>
      <select name="legal_area" required>
        <option value="" disabled selected>Select area</option>
        <option value="family">Family law</option>
        <option value="personal_injury">Personal injury</option>
        <option value="real_estate">Real estate</option>
        <option value="business">Business / corporate</option>
        <option value="immigration">Immigration</option>
        <option value="criminal">Criminal defence</option>
        <option value="wills">Wills &amp; estates</option>
        <option value="other">Other</option>
      </select>
    </div>
    <div class="form-row">
      <label>How soon do you need help?</label>
      <select name="timeline">
        <option value="" disabled selected>Select timeline</option>
        <option value="urgent">Urgently — within days</option>
        <option value="this_month">Within this month</option>
        <option value="planning_ahead">Planning ahead</option>
      </select>
    </div>`,

  health_wellness: `
    <div class="form-row">
      <label>Service you're interested in <span class="req">*</span></label>
      <select name="service_interest" required>
        <option value="" disabled selected>Select service</option>
        <option value="personal_training">Personal training</option>
        <option value="nutrition">Nutrition coaching</option>
        <option value="physiotherapy">Physiotherapy</option>
        <option value="massage">Massage therapy</option>
        <option value="yoga_pilates">Yoga / Pilates</option>
        <option value="mental_wellness">Mental wellness</option>
        <option value="other">Other</option>
      </select>
    </div>
    <div class="form-row">
      <label>Your primary goal</label>
      <input type="text" name="primary_goal" placeholder="e.g. Lose weight, recover from injury, reduce stress">
    </div>`,

  real_estate: `
    <div class="form-row">
      <label>Are you looking to buy or sell? <span class="req">*</span></label>
      <select name="intent" required>
        <option value="" disabled selected>Select</option>
        <option value="buy">Buy a property</option>
        <option value="sell">Sell a property</option>
        <option value="both">Both</option>
        <option value="invest">Investment property</option>
      </select>
    </div>
    <div class="form-row-2">
      <div>
        <label>Budget / price range</label>
        <select name="budget_range">
          <option value="" disabled selected>Select range</option>
          <option value="under_500k">Under $500k</option>
          <option value="500k_1m">$500k – $1M</option>
          <option value="1m_2m">$1M – $2M</option>
          <option value="2m_plus">$2M+</option>
        </select>
      </div>
      <div>
        <label>Timeline</label>
        <select name="timeline">
          <option value="" disabled selected>Select</option>
          <option value="asap">As soon as possible</option>
          <option value="3_months">Within 3 months</option>
          <option value="6_months">Within 6 months</option>
          <option value="just_browsing">Just exploring</option>
        </select>
      </div>
    </div>`,

  events_catering: `
    <div class="form-row-2">
      <div>
        <label>Event type <span class="req">*</span></label>
        <select name="event_type" required>
          <option value="" disabled selected>Select type</option>
          <option value="wedding">Wedding</option>
          <option value="corporate">Corporate event</option>
          <option value="birthday">Birthday / celebration</option>
          <option value="graduation">Graduation</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label>Approximate guest count</label>
        <select name="guest_count">
          <option value="" disabled selected>Select</option>
          <option value="under_50">Under 50</option>
          <option value="50_100">50 – 100</option>
          <option value="100_200">100 – 200</option>
          <option value="200_plus">200+</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <label>Estimated event date</label>
      <input type="text" name="event_date" placeholder="e.g. September 2025">
    </div>`,

  financial: `
    <div class="form-row">
      <label>Service you're interested in <span class="req">*</span></label>
      <select name="service_interest" required>
        <option value="" disabled selected>Select service</option>
        <option value="financial_planning">Financial planning</option>
        <option value="investment">Investment management</option>
        <option value="tax">Tax planning</option>
        <option value="retirement">Retirement planning</option>
        <option value="insurance">Insurance review</option>
        <option value="business">Business finance</option>
      </select>
    </div>
    <div class="form-row">
      <label>What's prompting you to reach out now?</label>
      <input type="text" name="trigger" placeholder="e.g. New job, upcoming retirement, inheritance">
    </div>`,

  coaching: `
    <div class="form-row">
      <label>What do you most want to work on? <span class="req">*</span></label>
      <select name="focus_area" required>
        <option value="" disabled selected>Select area</option>
        <option value="career">Career growth</option>
        <option value="leadership">Leadership</option>
        <option value="life">Life direction</option>
        <option value="business">Business strategy</option>
        <option value="confidence">Confidence / mindset</option>
        <option value="relationships">Relationships</option>
        <option value="other">Other</option>
      </select>
    </div>
    <div class="form-row">
      <label>What's your biggest challenge right now?</label>
      <textarea name="challenge" placeholder="Share a little about where you're stuck or what you want to change..." rows="2"></textarea>
    </div>`,

  beauty_salon: `
    <div class="form-row">
      <label>Service you're interested in <span class="req">*</span></label>
      <select name="service_type" required>
        <option value="" disabled selected>Select service</option>
        <option value="haircut">Haircut &amp; styling</option>
        <option value="colour">Hair colour</option>
        <option value="nails">Nails</option>
        <option value="facial">Facial / skincare</option>
        <option value="lashes">Lashes / brows</option>
        <option value="makeup">Makeup</option>
        <option value="bridal">Bridal package</option>
        <option value="other">Other</option>
      </select>
    </div>
    <div class="form-row">
      <label>Preferred appointment time</label>
      <select name="preferred_time">
        <option value="" disabled selected>Select preference</option>
        <option value="weekday_morning">Weekday morning</option>
        <option value="weekday_afternoon">Weekday afternoon</option>
        <option value="weekend">Weekend</option>
        <option value="flexible">I'm flexible</option>
      </select>
    </div>`,

  dental_medical: `
    <div class="form-row">
      <label>Type of appointment <span class="req">*</span></label>
      <select name="appointment_type" required>
        <option value="" disabled selected>Select type</option>
        <option value="checkup">Routine checkup / cleaning</option>
        <option value="consultation">New patient consultation</option>
        <option value="cosmetic">Cosmetic treatment</option>
        <option value="emergency">Emergency / urgent</option>
        <option value="followup">Follow-up</option>
      </select>
    </div>
    <div class="form-row">
      <label>Are you a new or existing patient?</label>
      <select name="patient_type">
        <option value="" disabled selected>Select</option>
        <option value="new">New patient</option>
        <option value="existing">Existing patient</option>
        <option value="returning">Returning patient</option>
      </select>
    </div>`,
};

/* ── Offer copy map ── */
const OFFER_COPY = {
  free_consultation: { cta: 'Book your free consultation', sub: 'No commitment. No pressure. Just a conversation.', verb: 'consultation' },
  free_quote:        { cta: 'Get your free quote',         sub: 'Fast turnaround. No obligation.',                  verb: 'quote'        },
  free_audit:        { cta: 'Request your free audit',     sub: 'Find out exactly what\'s working and what isn\'t.', verb: 'audit'        },
  free_trial:        { cta: 'Start your free trial',       sub: 'No credit card required.',                          verb: 'trial'        },
  free_guide:        { cta: 'Get the free guide',          sub: 'Instant access. No spam.',                          verb: 'guide'        },
  discount:          { cta: 'Claim your offer',            sub: 'Limited availability. Don\'t miss out.',            verb: 'offer'        },
  callback:          { cta: 'Book a callback',             sub: 'We\'ll call you at a time that suits.',             verb: 'callback'     },
};

/* ── Build testimonials HTML ── */
function buildTestimonialsHTML(data) {
  const testiCards = [];
  for (let i = 1; i <= 3; i++) {
    const quote = data[`testi_quote_${i}`];
    const name  = data[`testi_name_${i}`];
    const ctx   = data[`testi_context_${i}`];
    if (!quote || !name) continue;
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    testiCards.push(`
      <div class="testi-card">
        <div class="testi-quote-mark">"</div>
        <p class="testi-text">${quote}</p>
        <div class="testi-author">
          <div class="testi-avatar">${initials}</div>
          <div>
            <div class="testi-stars"><span>★</span><span>★</span><span>★</span><span>★</span><span>★</span></div>
            <div class="testi-name">${name}</div>
            ${ctx ? `<div class="testi-detail">${ctx}</div>` : ''}
          </div>
        </div>
      </div>`);
  }
  return testiCards.length ? `
    <section class="testimonials-section">
      <div class="section">
        <div class="testi-header">
          <div class="section-eyebrow centered">What clients say</div>
          <h2 class="testi-title">Don't just take <em>our word</em> for it.</h2>
        </div>
        <div class="testi-grid">${testiCards.join('')}</div>
      </div>
    </section>` : '';
}

/* ── Build smart fields HTML ── */
function getSmartFields(industry) {
  return SMART_FIELDS[industry] || `
    <div class="form-row">
      <label>How can we help you?</label>
      <select name="inquiry_type">
        <option value="" disabled selected>Select an option</option>
        <option value="general">General inquiry</option>
        <option value="pricing">Pricing information</option>
        <option value="availability">Check availability</option>
        <option value="other">Something else</option>
      </select>
    </div>`;
}

/* ── Build the full page prompt ── */
function buildPrompt(data) {
  const offer  = OFFER_COPY[data.primary_offer] || OFFER_COPY.free_consultation;
  const smart  = getSmartFields(data.industry);
  const testis = buildTestimonialsHTML(data);
  const color  = data.brand_color || '#1A6B4A';
  const fields = Array.isArray(data['fields[]']) ? data['fields[]'] : ['name','email','phone','city','message'];

  return `You are an expert web developer building a high-converting lead magnet landing page.

Generate a COMPLETE, production-ready single HTML file for the following business. Return ONLY the HTML — no explanation, no markdown code fences, no commentary before or after. Start with <!DOCTYPE html> and end with </html>.

BUSINESS DETAILS:
- Business name: ${data.business_name}
- Industry: ${data.industry}
- Primary offer: ${data.primary_offer} (CTA text: "${offer.cta}")
- Business description: ${data.business_desc || 'A professional ' + data.industry + ' business'}
- Brand colour: ${color}
- Domain: ${data.domain || 'yourdomain.com'}

PAGE REQUIREMENTS:
1. NO navigation menu, NO header nav links, NO footer nav links — this is a dedicated conversion page
2. Page sections in this exact order: Hero CTA → Why Us (4 benefits) → Testimonials (if provided) → Lead Form
3. The hero must have a large headline, subheadline, and a CTA button that anchor-scrolls to #lead-form
4. The "Why Us" section has 4 benefit cards with numbers 01–04 and short descriptive copy relevant to ${data.industry}
5. The form section headline should reference the offer: "${offer.cta}"
6. Below the form headline add: "${offer.sub}"

FORM FIELDS (in this exact order):
PRIMARY FIELDS (always include):
${fields.includes('name')    ? '- Full name (text, required)' : ''}
${fields.includes('email')   ? '- Email address (email, required)' : ''}
${fields.includes('phone')   ? '- Phone number (tel, required)' : ''}
${fields.includes('city')    ? '- City (text)' : ''}
SMART FIELDS (insert here — use exactly this HTML):
${smart}
${fields.includes('message') ? '- Message / notes (textarea, optional)' : ''}
HIDDEN UTM FIELDS (always include, id and name attributes required):
- <input type="hidden" name="utm_source" id="utm_source">
- <input type="hidden" name="utm_medium" id="utm_medium">
- <input type="hidden" name="utm_campaign" id="utm_campaign">
- <input type="hidden" name="utm_content" id="utm_content">
- <input type="hidden" name="utm_term" id="utm_term">
- <input type="hidden" name="landing_page" id="landing_page">

TESTIMONIALS SECTION:
${testis || 'No testimonials provided — omit the testimonials section entirely.'}

NOTIFICATION EMAIL: ${data.notify_email || 'none — omit email notification'}
WEBHOOK URL: APPS_SCRIPT_URL_HERE (placeholder — do not change)
GTM CONTAINER: ${data.gtm_id || 'GTM-XXXXXXX'} (insert in GTM snippet)

STYLING:
- Use Google Fonts — choose an elegant, professional pairing appropriate for ${data.industry}
- Brand colour ${color} for CTA buttons, accents, and section eyebrows
- Dark professional aesthetic or clean light aesthetic — choose what fits ${data.industry} best
- Mobile responsive — single column on small screens
- CSS and JS embedded in the single file — no external dependencies except Google Fonts and GTM

JAVASCRIPT (must include):
1. UTM capture script: on page load, read URL params, write to sessionStorage, populate hidden fields. Also push to window.dataLayer for GTM.
2. Form submission handler: preventDefault, push generate_lead event to dataLayer (NO PII in dataLayer), then fetch POST to APPS_SCRIPT_URL_HERE with JSON body of all field values including UTMs, then show a thank-you message replacing the form.
3. GTM snippet: use container ID ${data.gtm_id || 'GTM-XXXXXXX'}

Generate the complete HTML file now.`;
}

/* ── Main handler ── */
exports.handler = async (event) => {

  /* Handle CORS preflight */
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured in Netlify environment variables.' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  /* Validate required fields */
  if (!data.business_name || !data.industry || !data.primary_offer) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Missing required fields: business_name, industry, primary_offer' }) };
  }

  try {
    const prompt = buildPrompt(data);

    /* Call Claude API */
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${err}`);
    }

    const result = await response.json();
    const htmlPage = result.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim();

    /* Strip accidental markdown fences if present */
    const cleaned = htmlPage
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    /* Build slug from business name */
    const slug = data.business_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const filename = `${slug}-lead-page.html`;

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        success: true,
        filename,
        html: cleaned,
        business_name: data.business_name,
        industry: data.industry,
        gtm_id: data.gtm_id || '',
        ga4_id: data.ga4_id || '',
        deploy_path: data.can_edit_head === 'yes' ? 'same_domain' : 'subdomain',
        domain: data.domain || '',
      }),
    };

  } catch (err) {
    console.error('Generation error:', err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message || 'Generation failed' }),
    };
  }
};

/**
 * ============================================================================
 *  GRID MASTER — personal e-mail relay (Google Apps Script)
 * ============================================================================
 *
 *  WHAT THIS DOES
 *  --------------
 *  Every booking from your website is e-mailed straight to your inbox *from your
 *  own Gmail account*. There is no third-party relay, no activation link, and
 *  nothing that an ad-blocker can block — Gmail-to-Gmail delivery is the most
 *  reliable path there is, and replies go straight back to the customer.
 *
 *  SETUP (about 3 minutes, once)
 *  ----------------------------
 *  1. Open https://script.google.com  →  “New project”.
 *  2. Delete the sample code and paste this whole file.
 *  3. (Optional but recommended) Change SHARED_SECRET below to any long random
 *     text, then paste the same text into the website's Mail Delivery Center.
 *  4. Click “Deploy” → “New deployment” → type “Web app”:
 *        Description : Grid Master booking relay
 *        Execute as  : Me (your Gmail address)
 *        Who has access : Anyone
 *     Press “Deploy”, authorise the script (Google will warn that the app is not
 *     verified — choose “Advanced” → “Go to … (unsafe)”: it is your own script).
 *  5. Copy the “Web app URL” (it ends with /exec).
 *  6. Open the website → footer → “Mail Delivery Center” → paste that URL into
 *     “Personal relay URL” → Save → press “Run live delivery test”.
 *     A test message must arrive in your inbox — that is your proof.
 *
 *  HOW IT IS CALLED
 *  ----------------
 *  The website POSTs JSON (as text/plain so the browser needs no CORS preflight):
 *    { secret, to, cc, subject, text, html, fields, replyTo, source }
 *  and expects { ok: true, detail: "..." } back.
 *  A GET request answers a small health check — handy to verify the URL.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Where booking notifications are delivered (your inbox). */
var NOTIFY_EMAIL = 'contactgridmaster@gmail.com';

/** Optional extra copies. Example: ['ashish@example.com'] */
var CC_EMAILS = [];

/** Optional. Set the same value in the website's Mail Delivery Center.
 *  Blocks anybody who guesses your URL from sending you spam. */
var SHARED_SECRET = '';

/** Keep a copy of every booking in a Google Sheet (optional).
 *  Paste the spreadsheet ID from its URL: docs.google.com/spreadsheets/d/<ID>/edit
 *  Leave empty to skip the sheet. */
var SHEET_ID = '';

/** Also send the customer a short confirmation e-mail. */
var SEND_CONFIRMATION_TO_CUSTOMER = true;

// ---------------------------------------------------------------------------

/**
 * Health check — open the /exec URL in a browser and you should see this JSON.
 */
function doGet() {
  return json({ ok: true, service: 'grid-master-mail-relay', detail: 'Relay is live. POST bookings here.' });
}

/**
 * Receives one website submission and sends it by e-mail.
 */
function doPost(e) {
  try {
    var payload = parsePayload(e);

    if (SHARED_SECRET && payload.secret !== SHARED_SECRET) {
      return json({ ok: false, detail: 'Rejected: shared secret does not match.' });
    }

    var fields = payload.fields || {};
    var subject = payload.subject || ('New Grid Master booking ' + (fields.reference_id || ''));
    var textBody = payload.text || fieldsToText(fields);
    var htmlBody = payload.html || ('<pre style="font-family:monospace">' + escapeHtml(textBody) + '</pre>');

    var to = payload.to || NOTIFY_EMAIL;
    var cc = (payload.cc && payload.cc.length ? payload.cc : CC_EMAILS).join(',');

    MailApp.sendEmail({
      to: to,
      cc: cc,
      subject: subject,
      body: textBody,
      htmlBody: htmlBody,
      name: 'Grid Master Website',
      replyTo: payload.replyTo || undefined,
    });

    if (SEND_CONFIRMATION_TO_CUSTOMER && payload.replyTo) {
      try {
        MailApp.sendEmail({
          to: payload.replyTo,
          subject: 'Grid Master — we received your booking ' + (fields.reference_id || ''),
          body: customerConfirmation(fields),
          name: 'Grid Master Solar Systems',
          replyTo: NOTIFY_EMAIL,
        });
      } catch (confirmationError) {
        // A failed customer confirmation must never fail the booking itself.
      }
    }

    if (SHEET_ID) {
      appendToSheet(fields);
    }

    return json({
      ok: true,
      detail: 'Delivered from your Gmail to ' + to + ' at ' + new Date().toLocaleString(),
    });
  } catch (error) {
    return json({ ok: false, detail: 'Relay error: ' + (error && error.message ? error.message : error) });
  }
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function parsePayload(e) {
  var raw = (e && e.postData && e.postData.contents) || '';
  var data = {};

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (parseError) {
      // Fall back to a form-encoded body: a=1&b=2
      raw.split('&').forEach(function (pair) {
        var index = pair.indexOf('=');
        if (index > 0) {
          data[decodeURIComponent(pair.slice(0, index))] = decodeURIComponent(pair.slice(index + 1).replace(/\+/g, ' '));
        }
      });
    }
  }

  // Also accept plain form parameters.
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function (key) {
      if (data[key] === undefined) data[key] = e.parameter[key];
    });
  }

  if (!data.fields && data.customer_name) {
    data.fields = data;
  }
  return data;
}

function fieldsToText(fields) {
  return Object.keys(fields)
    .map(function (key) {
      var label = key.replace(/_/g, ' ').replace(/\b\w/g, function (character) {
        return character.toUpperCase();
      });
      var value = fields[key] === '' || fields[key] === null ? '-' : fields[key];
      return label + ': ' + value;
    })
    .join('\n');
}

function customerConfirmation(fields) {
  return [
    'Hello ' + (fields.customer_name || '') + ',',
    '',
    'Thank you for booking with Grid Master Solar Systems. We have received your request:',
    '',
    'Reference     : ' + (fields.reference_id || '-'),
    'Service       : ' + (fields.service_required || '-'),
    'Preferred date: ' + (fields.preferred_date || '-') + ' ' + (fields.time_slot || ''),
    'Property      : ' + (fields.property_location || '-'),
    '',
    'Head Engineer GANDHAMANENI GOUTHAM and the team will call you within 24 hours to confirm your',
    'site audit. If you need anything sooner, just reply to this e-mail or call +91 72007 45180.',
    '',
    'Grid Master Solar Systems',
    'Design • Installation • Grid Integration',
  ].join('\n');
}

function appendToSheet(fields) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Received', 'Reference', 'Name', 'Phone', 'Email', 'Location', 'Purpose', 'Service', 'Date', 'Slot', 'Notes']);
  }
  sheet.appendRow([
    new Date(),
    fields.reference_id || '',
    fields.customer_name || '',
    fields.customer_phone || '',
    fields.email || '',
    fields.property_location || '',
    fields.installation_purpose || '',
    fields.service_required || '',
    fields.preferred_date || '',
    fields.time_slot || '',
    fields.special_notes || '',
  ]);
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

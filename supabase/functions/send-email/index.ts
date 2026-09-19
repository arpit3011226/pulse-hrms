// Supabase Edge Function: Send Email via Resend
// Deploy: supabase functions deploy send-email
// Set secret: supabase secrets set RESEND_API_KEY=re_xxxxx

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_API_URL = 'https://api.resend.com/emails'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set. Add it via: supabase secrets set RESEND_API_KEY=re_xxxxx')
    }

    const { to, subject, html, from } = (await req.json()) as EmailRequest

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: from || 'Pulse HRMS <notifications@pulse-hrms.com>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html: wrapInTemplate(subject, html),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', data)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/** Wrap email body in a branded HTML template */
function wrapInTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 20px 32px; border-radius: 12px 12px 0 0; margin: -32px -32px 24px -32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .body { color: #374151; font-size: 15px; line-height: 1.6; }
    .footer { text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>${title}</h1>
      </div>
      <div class="body">
        ${body}
      </div>
      <div class="footer">
        Sent by Pulse HRMS &bull; Automated Workflow
      </div>
    </div>
  </div>
</body>
</html>`
}

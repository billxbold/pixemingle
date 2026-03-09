import crypto from 'crypto'

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^\[::1\]/,
  /^\[fc00:/,
  /^\[fe80:/,
]

function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    const hostname = url.hostname
    if (hostname === 'localhost') return true
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) return true
    }
    return false
  } catch {
    return true
  }
}

export async function sendWebhook(webhookUrl: string, payload: {
  event: string;
  match_id: string;
  theater_url?: string;
  summary: string;
}) {
  try {
    // Validate URL scheme
    if (!webhookUrl.startsWith('https://')) {
      console.error('Webhook rejected: URL must use https://', webhookUrl)
      return
    }

    // Block private/internal IPs
    if (isPrivateUrl(webhookUrl)) {
      console.error('Webhook rejected: private/internal URL', webhookUrl)
      return
    }

    const body = JSON.stringify(payload)

    // HMAC signature for verification
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const secret = process.env.OPENCLAW_GATEWAY_SECRET
    if (secret) {
      const signature = crypto.createHmac('sha256', secret).update(body).digest('hex')
      headers['X-Webhook-Signature'] = signature
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error('Webhook delivery failed:', webhookUrl, e);
  }
}

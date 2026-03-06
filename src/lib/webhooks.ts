export async function sendWebhook(webhookUrl: string, payload: {
  event: string;
  match_id: string;
  theater_url?: string;
  summary: string;
}) {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('Webhook delivery failed:', webhookUrl, e);
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body;
    if (!event) {
      return res.status(400).json({ error: 'Missing analytics event' });
    }

    return res.status(200).json({ success: true, received: Boolean(event) });
  } catch (error) {
    return res.status(500).json({ error: 'Analytics request failed' });
  }
}

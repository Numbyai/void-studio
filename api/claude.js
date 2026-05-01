module.exports = async function handler(req, res) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') return res.status(200).end();
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

      try {
              const body = req.body;
              const messages = body.messages || [];
              const maxTokens = body.max_tokens || 1000;

        // Convert Anthropic format to Gemini format
        const geminiMessages = messages.map(m => ({
                  role: m.role === 'assistant' ? 'model' : 'user',
                  parts: [{ text: typeof m.content === 'string' ? m.content : m.content[0]?.text || '' }]
        }));

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

        const geminiResponse = await fetch(geminiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                              contents: geminiMessages,
                              generationConfig: { maxOutputTokens: maxTokens }
                  })
        });

        const geminiData = await geminiResponse.json();

        if (!geminiResponse.ok) {
                  return res.status(geminiResponse.status).json({ error: geminiData.error?.message || 'Gemini API error' });
        }

        // Convert Gemini response back to Anthropic format so the app works unchanged
        const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
              return res.status(200).json({
                        content: [{ type: 'text', text }]
              });

      } catch (error) {
              return res.status(500).json({ error: 'Failed to call Gemini API', details: error.message });
      }
};

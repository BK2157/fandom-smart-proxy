function stripHTML(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export default async function handler(req, res) {
  const { universe, page, query = '' } = req.query;

  if (!universe || !page) {
    return res.status(400).json({ error: 'Missing universe or page' });
  }

  const base = `https://${universe}.fandom.com`;
  const url = `${base}/api.php?action=parse&page=${page}&prop=text&format=json`;

  try {
    const pageRes = await fetch(url);
    const data = await pageRes.json();
    const rawHTML = data?.parse?.text?.['*'];

    if (!rawHTML) {
      return res.status(404).json({ error: 'No content found on page' });
    }

    const plainText = stripHTML(rawHTML);

    // 🔍 Split and filter by query keyword (if provided)
    const lowerQuery = query.toLowerCase();
    const paragraphs = plainText
      .split(/\n|\.\s+/)
      .map(p => p.trim())
      .filter(p => p.length > 40); // basic sanity filter

    const relevant = query
      ? paragraphs.filter(p => p.toLowerCase().includes(lowerQuery)).slice(0, 10)
      : paragraphs.slice(0, 10); // default to first 10 chunks if no query

    res.status(200).json({
      title: page.replace(/_/g, ' '),
      query,
      foundCount: relevant.length,
      content: relevant.length > 0
        ? relevant
        : [`No directly relevant content found for "${query}".`]
    });
  } catch (e) {
    console.error('Smart skim error:', e);
    res.status(500).json({ error: 'Internal server error', details: e.message });
  }
}

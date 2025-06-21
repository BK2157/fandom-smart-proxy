function stripHTML(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export default async function handler(req, res) {
  const { universe, topic, query = '' } = req.query;

  if (!universe || !topic) {
    return res.status(400).json({ error: 'Missing universe or topic parameter' });
  }

  const base = `https://${universe}.fandom.com`;

  // Step 1: Search for a valid page
  const searchUrl = `${base}/api.php?action=opensearch&search=${encodeURIComponent(topic)}&limit=1&format=json`;

  try {
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const pageTitle = searchData?.[1]?.[0];

    if (!pageTitle) {
      return res.status(404).json({ error: `No page found for topic "${topic}"` });
    }

    // Step 2: Fetch and parse the page
    const contentUrl = `${base}/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=text&format=json`;
    const pageRes = await fetch(contentUrl);
    const pageData = await pageRes.json();
    const rawHTML = pageData?.parse?.text?.['*'];

    if (!rawHTML) {
      return res.status(404).json({ error: 'No content found on resolved page' });
    }

    const plainText = stripHTML(rawHTML);

    // Step 3: Filter content by query
    const lowerQuery = query.toLowerCase();
    const paragraphs = plainText
      .split(/\n|\.\s+/)
      .map(p => p.trim())
      .filter(p => p.length > 40);

    const relevant = query
      ? paragraphs.filter(p => p.toLowerCase().includes(lowerQuery)).slice(0, 10)
      : paragraphs.slice(0, 10);

    res.status(200).json({
      universe,
      topic,
      resolvedPage: pageTitle.replace(/ /g, '_'),
      query,
      foundCount: relevant.length,
      content: relevant.length > 0
        ? relevant
        : [`No directly relevant content found for "${query}" on page "${pageTitle}".`]
    });
  } catch (e) {
    console.error('Smart section error:', e);
    res.status(500).json({ error: 'Internal server error', details: e.message });
  }
}

function stripHTML(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export default async function handler(req, res) {
  const { universe, topic, query = '' } = req.query;

  if (!universe || !topic) {
    return res.status(400).json({ error: 'Missing universe or topic parameter' });
  }

  const base = `https://${universe}.fandom.com`;
  const searchVariants = [topic, topic.split(' ')[0]];

  let pageTitle = null;

  // Try multiple variants to resolve a valid page
  for (const variant of searchVariants) {
    const searchUrl = `${base}/api.php?action=opensearch&search=${encodeURIComponent(variant)}&limit=1&format=json`;

    try {
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      if (searchData?.[1]?.[0]) {
        pageTitle = searchData[1][0];
        break;
      }
    } catch (e) {
      console.error(`Search attempt failed for ${variant}:`, e.message);
    }
  }

  if (!pageTitle) {
    return res.status(404).json({ error: `No page found for topic "${topic}"` });
  }

  // Fetch page content
  const contentUrl = `${base}/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=text&format=json`;
  try {
    const pageRes = await fetch(contentUrl);
    const pageData = await pageRes.json();
    const rawHTML = pageData?.parse?.text?.['*'];

    if (!rawHTML) {
      return res.status(404).json({ error: 'No content found on resolved page' });
    }

    const plainText = stripHTML(rawHTML);

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
    console.error('Content fetch error:', e.message);
    return res.status(500).json({ error: 'Internal server error', details: e.message });
  }
}

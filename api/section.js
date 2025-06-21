function stripHTML(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export default async function handler(req, res) {
  const { universe, page, keyword = '' } = req.query;

  if (!universe || !page) {
    return res.status(400).json({ error: 'Missing universe or page parameter' });
  }

  const base = `https://${universe}.fandom.com`;
  const sectionListURL = `${base}/api.php?action=parse&page=${page}&prop=sections&format=json`;

  try {
    const listRes = await fetch(sectionListURL);
    const listData = await listRes.json();
    const sections = listData?.parse?.sections;

    if (!sections || sections.length === 0) {
      return res.status(404).json({ error: 'No sections found' });
    }

    // Filter based on keyword (if given), else return intro/top sections
    const filteredSections = keyword
      ? sections.filter(s => s.line.toLowerCase().includes(keyword.toLowerCase()))
      : sections.filter(s => s.toclevel <= 2).slice(0, 5); // default fallback

    if (filteredSections.length === 0) {
      return res.status(404).json({ error: `No sections found for keyword "${keyword}"` });
    }

    const sectionContents = [];

    for (const section of filteredSections) {
      const contentURL = `${base}/api.php?action=parse&page=${page}&prop=text&section=${section.index}&format=json`;
      const contentRes = await fetch(contentURL);
      const contentData = await contentRes.json();
      const contentHTML = contentData?.parse?.text?.['*'];

      sectionContents.push({
        title: section.line,
        level: section.toclevel,
        index: section.index,
        content: stripHTML(contentHTML || 'No content found')
      });
    }

    res.status(200).json({
      title: page.replace(/_/g, ' '),
      keyword: keyword || 'intro',
      sectionCount: sectionContents.length,
      sections: sectionContents
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export default async function handler(req, res) {
  const { universe, page } = req.query;

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

    // Get top-level and important subsections
    const filteredSections = sections.filter(s => s.toclevel <= 2).slice(0, 15);
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
        content: contentHTML || 'No content found'
      });
    }

    res.status(200).json({
      title: page.replace(/_/g, ' '),
      sectionCount: sectionContents.length,
      sections: sectionContents
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

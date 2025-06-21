export default async function handler(req, res) {
  const { universe, page, sectionName } = req.query;

  if (!universe || !page || !sectionName) {
    return res.status(400).json({ error: 'Missing universe, page, or sectionName' });
  }

  const base = `https://${universe}.fandom.com`;
  const sectionListURL = `${base}/api.php?action=parse&page=${page}&prop=sections&format=json`;

  try {
    const listRes = await fetch(sectionListURL);
    const listData = await listRes.json();
    const sections = listData?.parse?.sections;

    if (!sections || sections.length === 0) {
      return res.status(404).json({ error: 'No sections found for this page' });
    }

    // Normalize search
    const searchTerm = sectionName.toLowerCase().trim();

    // Preferred fallback section order
    const fallbackNames = [
      searchTerm,
      'plot', 'background', 'biography', 'story', 'history',
      'part i', 'part ii', 'arc', 'overview'
    ];

    // Try to find the best match based on fallbacks
    const matchedSection = fallbackNames
      .map(fallback => sections.find(s => s.line.toLowerCase() === fallback))
      .find(match => match);

    // If no exact match, fallback to contains
    const fuzzyMatch = !matchedSection
      ? sections.find(s => fallbackNames.some(f => s.line.toLowerCase().includes(f)))
      : null;

    const finalSection = matchedSection || fuzzyMatch;

    if (!finalSection) {
      return res.status(404).json({ error: `Section "${sectionName}" not found` });
    }

    // Now fetch the actual section content
    const sectionContentURL = `${base}/api.php?action=parse&page=${page}&prop=text&section=${finalSection.index}&format=json`;
    const contentRes = await fetch(sectionContentURL);
    const contentData = await contentRes.json();
    const contentHTML = contentData?.parse?.text?.['*'];

    res.status(200).json({
      title: page.replace(/_/g, ' '),
      matchedSection: finalSection.line,
      content: contentHTML || 'No content found'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

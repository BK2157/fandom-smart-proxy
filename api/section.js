export default async function handler(req, res) {
  const { universe, page, sectionName } = req.query;
  if (!universe || !page || !sectionName) {
    return res.status(400).json({ error: 'Missing universe, page, or sectionName' });
  }

  const base = `https://${universe}.fandom.com`;
  const sectionListURL = `${base}/api.php?action=parse&page=${page}&prop=sections&format=json`;
  const listRes = await fetch(sectionListURL);
  const listData = await listRes.json();
  const section = listData?.parse?.sections?.find(s =>
    s.line.toLowerCase() === sectionName.toLowerCase()
  );

  if (!section) return res.status(404).json({ error: 'Section not found' });

  const contentURL = `${base}/api.php?action=parse&page=${page}&prop=text&section=${section.index}&format=json`;
  const contentRes = await fetch(contentURL);
  const contentData = await contentRes.json();
  const contentHTML = contentData?.parse?.text?.['*'];

  res.status(200).json({
    title: page.replace(/_/g, ' '),
    section: sectionName,
    content: contentHTML || 'No content found'
  });
}

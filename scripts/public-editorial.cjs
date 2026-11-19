function source({ title, url }) {
  return { title, url };
}

function contestPage(item) {
  const { kind, title, category, organizer, summary, date, deadline, details, references } = item;
  return {
    kind, title, category, organizer, summary,
    ...(kind === "recruit" ? { deadline } : { date }),
    source: source(item.source),
    ...(details && { details: details.map(({ title, text }) => ({ title, text })) }),
    ...(references && { references: references.map(source) }),
  };
}

function trendPage({ lead, sections, images, sources }) {
  return {
    lead,
    sections: sections.map(({ heading, paragraphs }) => ({ heading, paragraphs })),
    images: images.map(({ url, alt, caption, credit, license, licenseUrl, sourceUrl }) =>
      ({ url, alt, caption, credit, license, licenseUrl, sourceUrl })),
    sources: sources.map(source),
  };
}

module.exports = { contestPage, trendPage };

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

function trendPage({ lead, sections, images, sources, palette }) {
  return {
    lead,
    ...(palette?.length && { palette: palette.map(({label, brand, hex, tcx, name}) => ({label, brand, hex, tcx, name})) }),
    sections: sections.map(({ heading, paragraphs, references, looks }) => ({
      heading, paragraphs,
      ...(looks?.length && { looks: looks.map(({url, gallery, label, credit, paragraph}) => ({url, gallery, label, credit, paragraph})) }),
      ...(references?.length && { references: references.map(source) }),
    })),
    images: images.map(({ url, alt, caption, credit, license, licenseUrl, sourceUrl }) =>
      ({ url, alt, caption, credit, license, licenseUrl, sourceUrl })),
    sources: sources.map(source),
  };
}

module.exports = { contestPage, trendPage };

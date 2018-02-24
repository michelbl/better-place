
function buildDceId(annonceId, orgAcronym) {
  return `${annonceId}-${orgAcronym}`;
}

module.exports = {
  buildDceId,
}

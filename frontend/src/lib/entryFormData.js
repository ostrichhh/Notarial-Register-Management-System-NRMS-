const collapseSpaces = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeName = (value) => collapseSpaces(value).toLowerCase();

export function formatPartyIdsOnly(parties = []) {
  const ids = [];

  for (const party of parties || []) {
    for (const identity of party.identities || []) {
      const idType = collapseSpaces(identity.id_type);
      const idNumber = collapseSpaces(identity.id_number);
      if (idType && idNumber) {
        ids.push(`${idType}: ${idNumber}`);
      }
    }
  }

  return ids.join('\n') || 'N/A';
}

export function sanitizeEntryTitle(title, people = []) {
  let cleanTitle = collapseSpaces(title);

  for (const person of people) {
    const name = collapseSpaces(person.name);
    if (!name) continue;

    cleanTitle = cleanTitle
      .replace(new RegExp(`\\b${escapeRegExp(name)}\\b`, 'gi'), ' ')
      .replace(/\s*[-–—,/;:]+\s*$/g, '')
      .replace(/^\s*[-–—,/;:]+\s*/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  return cleanTitle;
}

export function normalizeParties(parties = []) {
  return parties
    .map((party) => ({
      name: collapseSpaces(party.name),
      address: collapseSpaces(party.address),
      identities: (party.identities || [])
        .map((identity) => ({
          id_type: collapseSpaces(identity.id_type),
          id_number: collapseSpaces(identity.id_number),
        }))
        .filter((identity) => identity.id_type && identity.id_number),
    }))
    .filter((party) => party.name);
}

export function normalizeWitnesses(witnesses = []) {
  return witnesses
    .map((witness) => ({
      name: collapseSpaces(witness.name),
      address: collapseSpaces(witness.address),
    }))
    .filter((witness) => witness.name);
}

export function findOverlappingPeople(parties = [], witnesses = []) {
  const partyNames = new Set(parties.map((party) => normalizeName(party.name)).filter(Boolean));
  return witnesses
    .map((witness) => collapseSpaces(witness.name))
    .filter((name) => name && partyNames.has(normalizeName(name)));
}

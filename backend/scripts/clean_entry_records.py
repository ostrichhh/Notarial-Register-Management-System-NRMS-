from __future__ import annotations

import re

from api.models import Entry, Witness


FIRST = [
    "Juan", "Jose", "Maria", "Ana", "Mark", "Paolo", "Miguel", "Carlo", "Jasmine", "Angel",
    "Grace", "Rafael", "Daniel", "Elena", "Sofia", "Gabriel", "Isabella", "Francis", "Therese", "Manuel",
]

LAST = [
    "Dela Cruz", "Santos", "Reyes", "Garcia", "Mendoza", "Bautista", "Navarro", "Flores", "Cruz", "Aquino",
    "Castillo", "Rivera", "Torres", "Ramos", "Gonzales", "Villanueva", "Domingo", "Lopez", "Hernandez", "Perez",
]

STREETS = [
    "Rizal Ave", "Mabini St", "Bonifacio Rd", "Taft Ave", "J.P. Rizal St",
    "Del Pilar St", "Luna St", "Recto Ave", "Burgos St", "Quezon Ave",
]

CITIES = [
    "Manila", "Quezon City", "Makati", "Pasig", "Taguig",
    "Mandaluyong", "Caloocan", "Parañaque", "Las Piñas", "Marikina",
]

PROV = ["NCR", "Laguna", "Cavite", "Bulacan", "Rizal"]


def pick(seq: list[str], n: int) -> str:
    return seq[n % len(seq)]


def clean_title(title: str) -> str:
    title = re.sub(r"\s+", " ", title or "").strip()
    title = re.split(r"\s+[—–-]\s+", title, maxsplit=1)[0].strip()
    return re.sub(r"\s+", " ", title).strip()


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip().lower()


def witness_profile(seed: int, party_names: set[str]) -> tuple[str, str]:
    for offset in range(0, 80):
        n = seed + 7 + offset
        name = f"{pick(FIRST, n * 2)} {pick(LAST, n * 5)}"
        if normalize(name) not in party_names:
            house = 50 + (n % 950)
            address = f"{house} {pick(STREETS, n * 3)}, {pick(CITIES, n * 4)}, {pick(PROV, n * 6)}"
            return name, address
    return f"Notarial Witness {seed}", "Office witness address"


def main() -> None:
    entries = list(Entry.objects.prefetch_related("parties", "witnesses").all().order_by("id"))
    title_updates = []
    witness_updates = []

    for entry in entries:
        cleaned_title = clean_title(entry.title)
        if cleaned_title and cleaned_title != entry.title:
            entry.title = cleaned_title
            title_updates.append(entry)

        party_names = {normalize(p.name) for p in entry.parties.all() if normalize(p.name)}
        for index, witness in enumerate(entry.witnesses.all()):
            if normalize(witness.name) in party_names:
                witness.name, witness.address = witness_profile((witness.id or 0) + index, party_names)
                witness_updates.append(witness)

    if title_updates:
        Entry.objects.bulk_update(title_updates, ["title"], batch_size=1000)
    if witness_updates:
        Witness.objects.bulk_update(witness_updates, ["name", "address"], batch_size=1000)

    print({
        "entries_scanned": len(entries),
        "titles_cleaned": len(title_updates),
        "witnesses_cleaned": len(witness_updates),
    })


if __name__ == "__main__":
    main()

from __future__ import annotations

from api.models import Party, Witness


FIRST = [
    "Juan",
    "Jose",
    "Maria",
    "Ana",
    "Mark",
    "Paolo",
    "Miguel",
    "Carlo",
    "Jasmine",
    "Angel",
    "Grace",
    "Rafael",
    "Daniel",
    "Elena",
    "Sofia",
    "Gabriel",
    "Isabella",
    "Francis",
    "Therese",
    "Manuel",
]

LAST = [
    "Dela Cruz",
    "Santos",
    "Reyes",
    "Garcia",
    "Mendoza",
    "Bautista",
    "Navarro",
    "Flores",
    "Cruz",
    "Aquino",
    "Castillo",
    "Rivera",
    "Torres",
    "Ramos",
    "Gonzales",
    "Villanueva",
    "Domingo",
    "Lopez",
    "Hernandez",
    "Perez",
]

STREETS = [
    "Rizal Ave",
    "Mabini St",
    "Bonifacio Rd",
    "Taft Ave",
    "J.P. Rizal St",
    "Del Pilar St",
    "Luna St",
    "Recto Ave",
    "Burgos St",
    "Quezon Ave",
]

CITIES = [
    "Manila",
    "Quezon City",
    "Makati",
    "Pasig",
    "Taguig",
    "Mandaluyong",
    "Caloocan",
    "Parañaque",
    "Las Piñas",
    "Marikina",
]

PROV = ["NCR", "Laguna", "Cavite", "Bulacan", "Rizal"]


def pick(seq: list[str], n: int) -> str:
    return seq[n % len(seq)]


def main() -> None:
    parties = list(Party.objects.all().order_by("id"))
    for p in parties:
        n = int(p.id or 0)
        fn = pick(FIRST, n)
        ln = pick(LAST, n * 3)
        house = 100 + (n % 900)
        st = pick(STREETS, n * 5)
        city = pick(CITIES, n * 7)
        prov = pick(PROV, n * 11)
        p.name = f"{fn} {ln}"
        p.address = f"{house} {st}, {city}, {prov}"
    Party.objects.bulk_update(parties, ["name", "address"], batch_size=1000)

    witnesses = list(Witness.objects.all().order_by("id"))
    for w in witnesses:
        n = int(w.id or 0) + 7
        fn = pick(FIRST, n * 2)
        ln = pick(LAST, n * 5)
        house = 50 + (n % 950)
        st = pick(STREETS, n * 3)
        city = pick(CITIES, n * 4)
        prov = pick(PROV, n * 6)
        w.name = f"{fn} {ln}"
        w.address = f"{house} {st}, {city}, {prov}"
    Witness.objects.bulk_update(witnesses, ["name", "address"], batch_size=1000)

    print(
        {
            "parties_updated": len(parties),
            "witnesses_updated": len(witnesses),
        }
    )


if __name__ == "__main__":
    main()


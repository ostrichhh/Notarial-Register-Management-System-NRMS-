from __future__ import annotations

from api.models import Entry


ACK_TITLES = [
    "Deed of Absolute Sale",
    "Special Power of Attorney",
    "Affidavit of Loss",
    "Affidavit of Support",
    "Contract to Sell",
    "Loan Agreement",
    "Memorandum of Agreement",
    "Quitclaim / Waiver",
]

SUB_TITLES = [
    "Affidavit of Loss",
    "Affidavit of Undertaking",
    "Affidavit of Discrepancy",
    "Affidavit of One and the Same Person",
    "Affidavit of Guardianship",
    "Affidavit of Residency",
    "Affidavit of Late Registration",
    "Affidavit of Correction",
]

CERT_TITLES = [
    "Certification of Appearance",
    "Certification of Good Moral Character",
    "Certified True Copy",
    "Certification of No Record",
    "Certification of Employment",
    "Certification of Indigency",
]


def main() -> None:
    qs = Entry.objects.prefetch_related("parties").all().order_by("id")
    entries = list(qs)
    updated = 0

    for e in entries:
        # Only rewrite placeholder/synthetic titles
        t = (e.title or "").strip()
        if t and not t.lower().startswith("sample document"):
            continue

        if e.notarial_type == "ACK":
            base = ACK_TITLES[e.entry_number % len(ACK_TITLES)]
        elif e.notarial_type == "SUB":
            base = SUB_TITLES[e.entry_number % len(SUB_TITLES)]
        else:
            base = CERT_TITLES[e.entry_number % len(CERT_TITLES)]

        e.title = base
        updated += 1

    if updated:
        Entry.objects.bulk_update(entries, ["title"], batch_size=1000)

    print({"entries_scanned": len(entries), "titles_updated": updated})


if __name__ == "__main__":
    main()


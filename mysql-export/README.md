# Krio Griot — Airtable → MySQL export

Generated from Airtable base `app8m4USNF5opdXBp`. This folder contains a clean, MySQL-ready
export of your genealogy base.

## What's here

```
mysql-export/
├── schema.sql          CREATE DATABASE + CREATE TABLE for all 11 tables (+ archive table)
├── load_data.sql       LOAD DATA statements to import every CSV
├── README.md           this file
└── csv/
    ├── people.csv               7  (curated ancestors only — see note)
    ├── research_questions.csv   2
    ├── sources.csv              90
    ├── evidence_analysis.csv    3
    ├── dna_testing.csv          2
    ├── dna_matches.csv          1
    ├── collections.csv          14
    ├── archives.csv             2
    ├── donors.csv               2
    ├── storage.csv              1
    └── research_log.csv         1
```

## About the People table (important)

Your Airtable People table holds **2,770 records**, almost all auto-imported from a GEDCOM
family tree (Ancestry usernames, GEDCOM IDs, distant nodes). Rather than carry that clutter
into MySQL, this export uses a **curated `people` table** containing only the **7 ancestors your
other tables actually reference** (Venus Perrin, Albert Daggs, Aisha Abdul Rahman,
William S. Redmond III, Mabel Katie Harts Street, J. Demetris Daggs, Marvin Epps).

The full 2,770-row tree is preserved separately in a `people_tree_archive` table so you can
mine it later without polluting your working data. To load it, drop your native Airtable
People CSV export into `csv/people_full_export.csv` and adjust the column list in
`load_data.sql` to match that file's header row.

## How the data is shaped

- Each row keeps its Airtable `record_id` as the primary key, so links between tables are preserved.
- Linked-record and lookup fields are written as human-readable names joined by `; `
  (e.g. a Collection's `Family Names` = `The Harts Papers; The Street Papers`).
- Checkboxes are `1`/`0`; empty cells import as `NULL`.

## Importing

Requires local-infile enabled on both client and server.

```bash
cd mysql-export
mysql --local-infile=1 -u root -p < schema.sql
mysql --local-infile=1 -u root -p kriogriot < load_data.sql
```

All columns are typed conservatively (text/varchar, with real DATE/number/checkbox where safe)
and nullable, so the import is forgiving. Tighten types with `ALTER TABLE` afterward if you want.

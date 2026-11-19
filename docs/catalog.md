# National catalog

The national taxonomy is application data: migrations `202611190003_moroccan_cities.sql` and `202611190004_artisan_trades.sql` install it even without the demo seed. Existing slugs, labels, archive decisions and profile references are preserved. Apply both migrations to an existing installation; do not reset the database. `PILOT_CITY` selects the default city, not the geographic reach of the service.

## Locations

**385 choices:** 221 municipalities and 164 named urban centres in the 12-region HCP RGPH 2024 census snapshot. This is urban coverage, not a list of every rural douar. Both names come from the [HCP legal population workbook](https://www.hcp.ma/file/242341/). The [urban housing workbook](https://www.hcp.ma/file/246208/) distinguishes urban municipalities from rural communes that contain a named urban centre. The municipality of Lagouira is explicitly included from the population workbook. City districts are not separate cities. Places sharing a name (e.g. Ajdir) are distinguished by province.

Attribution: Haut-Commissariat au Plan, RGPH 2024; [HCP reuse terms](https://www.hcp.ma/Conditions-generales-d-utilisation-Version-1-0_a2194.html), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Adaptations: selected urban units, removed administrative prefixes, disambiguated names, added URL slugs and common spelling aliases. Regenerate the pinned snapshot using Python 3.11+:

```sh
python3 scripts/catalog/cities.py population.xlsx urban-housing.xlsx > cities.sql
```

Compare the output with the committed migration. Publish future revisions as new migrations. Updating data needs no external service at runtime.

## Trades

The 190 searchable marketplace categories draw on the Moroccan national artisan register's production and service branches ([decree 2.21.991, Bulletin officiel 7056, pp. 155–160](https://rna.gov.ma/wp-content/uploads/2022/05/القانون-50-17-ونصوصه-التطبيقية.pdf)). The vocabulary includes building work, repairs, textiles, leather, wood, metal, ceramics, jewellery, food crafts, personal services and traditional decorative arts. It also includes home-service specialities such as drainage, gardening, cleaning and home automation. Labels and aliases are adapted for customers; these are marketplace categories, not a certification register or a one-to-one legal classification.

Search a trade by its French or Arabic name, slug or configured alias (e.g. `nejjar`, `نجار`, `menuisier`). The city filter and full trade browser accept partial matches in either language. Artisans can filter their trade checklist without losing previous selections. Staff can add or archive entries in the catalog editor.

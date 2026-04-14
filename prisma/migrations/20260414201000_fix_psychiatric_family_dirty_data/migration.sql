WITH normalized AS (
  SELECT
    "id",
    lower(coalesce("nombre", '') || ' ' || coalesce("principioActivo", '')) AS search_text
  FROM "Medicamento"
),
resolved AS (
  SELECT
    "id",
    CASE
      WHEN search_text LIKE '%sertralina%' OR search_text LIKE '%fluoxetina%' OR search_text LIKE '%escitalopram%' OR search_text LIKE '%paroxetina%' OR search_text LIKE '%citalopram%' OR search_text LIKE '%fluvoxamina%' THEN 'ISRS'
      WHEN search_text LIKE '%venlafaxina%' OR search_text LIKE '%duloxetina%' OR search_text LIKE '%desvenlafaxina%' THEN 'IRSN'
      WHEN search_text LIKE '%quetiapina%' OR search_text LIKE '%risperidona%' OR search_text LIKE '%olanzapina%' OR search_text LIKE '%aripiprazol%' OR search_text LIKE '%haloperidol%' OR search_text LIKE '%clozapina%' OR search_text LIKE '%ziprasidona%' OR search_text LIKE '%paliperidona%' OR search_text LIKE '%amisulprida%' OR search_text LIKE '%asenapina%' THEN 'Antipsicótico'
      WHEN search_text LIKE '%diazepam%' OR search_text LIKE '%alprazolam%' OR search_text LIKE '%clonazepam%' OR search_text LIKE '%lorazepam%' OR search_text LIKE '%midazolam%' OR search_text LIKE '%bromazepam%' OR search_text LIKE '%clordiazepoxido%' OR search_text LIKE '%oxazepam%' OR search_text LIKE '%temazepam%' OR search_text LIKE '%triazolam%' OR search_text LIKE '%tetrazepam%' THEN 'Benzodiacepina'
      WHEN search_text LIKE '%zolpidem%' OR search_text LIKE '%zopiclona%' OR search_text LIKE '%eszopiclona%' THEN 'Hipnótico'
      ELSE NULL
    END AS expected_family
  FROM normalized
)
UPDATE "Medicamento" m
SET
  "familia" = r.expected_family,
  "updatedAt" = CURRENT_TIMESTAMP
FROM resolved r
WHERE m."id" = r."id"
  AND r.expected_family IS NOT NULL
  AND coalesce(m."familia", '') <> r.expected_family;

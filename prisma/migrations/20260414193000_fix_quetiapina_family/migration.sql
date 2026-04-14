-- Fix false-positive antibiotic family for quetiapine rows imported from vademecum.
UPDATE "Medicamento"
SET "familia" = 'Antipsicótico'
WHERE lower(coalesce("principioActivo", '')) LIKE '%quetiapina%'
  AND lower(coalesce("familia", '')) = 'antibiótico';

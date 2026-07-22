-- Migration to add 'gelato-dark' and 'abyss' to the allowed theme_id values

ALTER TABLE companies
  DROP CONSTRAINT IF EXISTS companies_theme_id_check;

ALTER TABLE companies
  ADD CONSTRAINT companies_theme_id_check 
  CHECK (theme_id IN ('gelato', 'gelato-dark', 'sky', 'forest', 'ember', 'abyss'));

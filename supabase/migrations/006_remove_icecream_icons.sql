-- Migration to remove IceCream icons

UPDATE categories SET icon = 'Package' WHERE icon = 'IceCreamCone';
UPDATE categories SET icon = 'Package' WHERE icon = 'IceCreamBowl';
UPDATE companies SET icon = 'Store' WHERE icon = 'IceCreamCone';

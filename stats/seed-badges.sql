MERGE game.FuelBadgeDefinitions AS target
USING (
  VALUES
    ('PREMIER_GESTE', N'Premier Geste', N'Premiere amelioration de consommation vs baseline', 'SEEDLING', 10),
    ('SUR_LA_LANCEE', N'Sur la lancee', N'Deux mois consecutifs sous baseline', 'STREAK', 20),
    ('MINUS_5', N'-5% L100', N'Amelioration mensuelle d au moins 5% sur L100', 'BOLT', 30),
    ('ECO_HERO', N'Eco Hero', N'Amelioration mensuelle d au moins 10% sur L100', 'TROPHY', 40),
    ('REGULARISTE', N'Regulariste', N'Trois mois consecutifs sous baseline', 'CHART', 50),
    ('MOIS_PARFAIT', N'Mois Parfait', N'Points baseline et trend obtenus le meme mois', 'STAR', 60),
    ('CHAMPION', N'Champion', N'Numero 1 de la saison', 'CROWN', 70)
) AS source (BadgeCode, Name, Description, Icon, SortOrder)
ON target.BadgeCode = source.BadgeCode
WHEN MATCHED THEN
  UPDATE SET
    target.Name = source.Name,
    target.Description = source.Description,
    target.Icon = source.Icon,
    target.SortOrder = source.SortOrder
WHEN NOT MATCHED THEN
  INSERT (BadgeCode, Name, Description, Icon, SortOrder)
  VALUES (source.BadgeCode, source.Name, source.Description, source.Icon, source.SortOrder);

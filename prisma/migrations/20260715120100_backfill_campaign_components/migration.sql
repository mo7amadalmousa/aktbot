-- ترحيل additive: الحملات القائمة (type حصريّ) → المكوّن المكافئ. لا فقد بيانات.
-- الميزانية/المصروف/الإعداد تُنسخ من الحقول القديمة إلى حقول المكوّن.

-- SALE → مكوّن البيع
UPDATE "Campaign"
SET "saleEnabled" = true,
    "saleBudget" = "budgetAmount",
    "saleSpent" = "spentAmount",
    "saleCreatorBps" = ("payoutConfig"->>'creatorBps')::int,
    "saleFixedPerSale" = ("payoutConfig"->>'fixedPerSale')::int
WHERE "type" = 'SALE';

-- PERFORMANCE → مكوّن الأداء
UPDATE "Campaign"
SET "performanceEnabled" = true,
    "performanceBudget" = "budgetAmount",
    "performanceSpent" = "spentAmount",
    "performanceCpc" = ("payoutConfig"->>'cpcMinor')::int
WHERE "type" = 'PERFORMANCE';

-- UGC → مكوّن المحتوى (usageRightsWanted/Budget/Spent موجودة مسبقاً)
UPDATE "Campaign"
SET "contentEnabled" = true,
    "contentBudget" = "budgetAmount",
    "contentSpent" = "spentAmount",
    "contentPerItem" = ("payoutConfig"->>'fixedPerContent')::int
WHERE "type" = 'UGC';

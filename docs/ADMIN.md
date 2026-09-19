# Admin Dashboard (SQL)

Service role yoki Supabase Dashboard SQL Editor orqali.

## Daily KPI

```sql
SELECT * FROM admin_kpi_daily;
```

| Column | Meaning |
|--------|---------|
| new_users | Bugungi yangi foydalanuvchilar |
| new_vacancies | Yangi e’lonlar |
| new_tasks | Yangi micro-vazifalar |
| releases_today | Bugungi escrow release |
| open_disputes | Ochiq nizolar |
| escrow_held_total | Hozir ushlab turilgan summa |
| avg_match_minutes_7d | 7 kunlik o‘rtacha match vaqti (daqiqa) |

## Task funnel

```sql
SELECT * FROM admin_task_funnel;
```

## Top regions

```sql
SELECT * FROM admin_top_regions LIMIT 10;
```

## Pending verifications

```sql
SELECT v.*, p.full_name, p.phone
FROM verifications v
JOIN profiles p ON p.id = v.user_id
WHERE v.status = 'pending'
ORDER BY v.created_at;
```

Approve (manual):

```sql
UPDATE verifications
SET status = 'approved', reviewed_at = now()
WHERE id = '<id>';
```

## Disputed escrows

```sql
SELECT e.*, t.title, t.status AS task_status
FROM escrow_transactions e
JOIN micro_tasks t ON t.id = e.micro_task_id
WHERE e.status = 'disputed'
ORDER BY e.updated_at DESC;
```

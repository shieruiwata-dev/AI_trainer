-- 食事記録に脂質・炭水化物の列を追加(PFCゲージ表示用)
alter table public.meal_logs add column if not exists fat_g numeric;
alter table public.meal_logs add column if not exists carbs_g numeric;

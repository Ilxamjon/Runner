-- Seed data: regions, industries, task categories (Uzbekistan focus)

INSERT INTO regions (name_uz, name_ru, sort_order) VALUES
  ('Toshkent', 'Ташкент', 1),
  ('Samarqand', 'Самарканд', 2),
  ('Buxoro', 'Бухара', 3),
  ('Farg''ona', 'Фергана', 4),
  ('Andijon', 'Андижан', 5);

INSERT INTO industries (name_uz, name_ru, sort_order) VALUES
  ('Savdo', 'Торговля', 1),
  ('Qurilish', 'Строительство', 2),
  ('Transport', 'Транспорт', 3),
  ('IT', 'IT', 4),
  ('Xizmat ko''rsatish', 'Сфера услуг', 5),
  ('Ta''lim', 'Образование', 6);

INSERT INTO task_categories (slug, name_uz, name_ru, sort_order) VALUES
  ('yard-work', 'Hovli ishlari', 'Работа во дворе', 1),
  ('trash-disposal', 'Chiqindi olib ketish', 'Вывоз мусора', 2),
  ('moving', 'Ko''chirish', 'Переезд', 3),
  ('cleaning', 'Tozalash', 'Уборка', 4),
  ('delivery', 'Yetkazib berish', 'Доставка', 5),
  ('urgent-errand', 'Shoshilinch topshiriq', 'Срочное поручение', 6);

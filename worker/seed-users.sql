-- Seed users for Real Estate CRM
-- Passwords: 
-- kernesgenaa@gmail.com / Qwerty1122
-- angelovamakarenko@gmail.com / Frag6677

INSERT INTO users (id, email, password_hash, full_name, role, phone, telegram)
VALUES (
  'u001', 
  'kernesgenaa@gmail.com', 
  'f1dfe00239c7411d3e4fe8be9eb08644:f975b7ad49ceb80dba4eaee9e2265cc7cb82dae8ffb856c25a8cae1e18102af9', 
  'Геннадій Кернес', 
  'superuser', 
  '+380501234567', 
  '@kernes_admin'
);

INSERT INTO users (id, email, password_hash, full_name, role, phone, telegram)
VALUES (
  'u002', 
  'angelovamakarenko@gmail.com', 
  '24b6048fa43b0ad813e56446f4e51f26:4d969cc85583da5e74506feae30505a12afc16805cb7c9428cf138e0f0801fe6', 
  'Ангелова Макаренко', 
  'top_manager', 
  '+380671234567', 
  '@angelova_top'
);

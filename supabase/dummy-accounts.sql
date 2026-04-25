-- =============================================
-- DigiChatbot - Buat Akun Dummy
-- Jalankan SETELAH setup.sql berhasil
-- =============================================

-- PENTING: Jangan jalankan SQL ini!
-- Gunakan Supabase Dashboard untuk membuat akun dummy:
--
-- 1. Buka Supabase Dashboard > Authentication > Users
-- 2. Klik "Add User" > "Create New User"
--
-- AKUN ADMIN:
--   Email: admin@digichat.ac.id
--   Password: admin123456
--   Centang "Auto Confirm User" agar tidak perlu verifikasi email
--
-- AKUN MAHASISWA:
--   Email: mahasiswa@digichat.ac.id
--   Password: mhs123456
--   Centang "Auto Confirm User" agar tidak perlu verifikasi email
--
-- 3. Setelah kedua user dibuat, jalankan SQL berikut untuk set role:

-- Set role admin
UPDATE profiles 
SET role = 'admin', full_name = 'Admin DigiChatbot'
WHERE email = 'admin@digichat.ac.id';

-- Set role student
UPDATE profiles 
SET role = 'student', full_name = 'Mahasiswa Demo'
WHERE email = 'mahasiswa@digichat.ac.id';

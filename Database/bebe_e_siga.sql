-- bebe_e_siga.sql: script inicial da base de dados MySQL.
-- Cria as tabelas do módulo de acesso (Sprint 1): marcas e utilizadores.
-- As tabelas dos outros módulos entram nas próximas sprints.

CREATE DATABASE IF NOT EXISTS bebe_e_siga
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE bebe_e_siga;

-- Marcas registadas na aplicação (RF31)
CREATE TABLE IF NOT EXISTS brands (
    brand_id INT AUTO_INCREMENT PRIMARY KEY,
    brand_name VARCHAR(60) NOT NULL UNIQUE,
    logo_path VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Contas de acesso: cada conta pertence a uma marca e tem um perfil (RBAC).
-- A palavra-passe fica guardada com bcrypt; o sal vai dentro do próprio hash.
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    brand_id INT NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Administrador', 'Gestor', 'Colaborador') NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_brand
        FOREIGN KEY (brand_id) REFERENCES brands (brand_id)
        ON DELETE CASCADE
);

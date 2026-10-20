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
   ) ENGINE=InnoDB;

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
   ) ENGINE=InnoDB;
   -- Eventos de cada marca (RF04, US01). Cada evento é independente.
CREATE TABLE IF NOT EXISTS events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    brand_id INT NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    space_type ENUM('Interior', 'Exterior', 'Misto') NULL,
    expected_audience INT NULL,
    budget DECIMAL(10,2) NULL,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_events_brand
        FOREIGN KEY (brand_id) REFERENCES brands (brand_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_events_user
        FOREIGN KEY (created_by) REFERENCES users (user_id)
) ENGINE=InnoDB;

-- Dias de cada evento (RF05). Podem não ser seguidos e cada um pode ter o seu horário.
-- Se end_time for mais cedo do que start_time (ex.: 20:00 até 02:00), o dia passa da meia-noite.
CREATE TABLE IF NOT EXISTS event_days (
    event_day_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    event_date DATE NOT NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    CONSTRAINT uq_event_days_date UNIQUE (event_id, event_date),
    CONSTRAINT fk_event_days_event
        FOREIGN KEY (event_id) REFERENCES events (event_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- Despesas do evento (RF20): do evento completo (event_day_id vazio) ou de um dia.
-- As despesas iniciais do planeamento ficam aqui desde o início.
CREATE TABLE IF NOT EXISTS expenses (
    expense_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    event_day_id INT NULL,
    description VARCHAR(150) NOT NULL,
    expense_type ENUM('Fixa', 'Variável') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expenses_event
        FOREIGN KEY (event_id) REFERENCES events (event_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_expenses_day
        FOREIGN KEY (event_day_id) REFERENCES event_days (event_day_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_expenses_user
        FOREIGN KEY (created_by) REFERENCES users (user_id)
) ENGINE=InnoDB;

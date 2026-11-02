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
    revenue_target DECIMAL(10,2) NULL,  -- objetivo de faturação do dia (RF05, usado no RF32)
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

-- Fornecedores de cada marca (RF11). Partilhados entre os eventos da marca.
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    brand_id INT NOT NULL,
    supplier_name VARCHAR(100) NOT NULL,
    contact VARCHAR(50) NOT NULL,
    email VARCHAR(255) NULL,
    nif VARCHAR(20) NULL,
    address VARCHAR(255) NULL,
    accepts_returns BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_suppliers_brand
        FOREIGN KEY (brand_id) REFERENCES brands (brand_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- Produtos de cada marca (RF07). A quantidade é sempre na unidade base:
-- unidade, grama ou mililitro (ex.: um barril de 30 L tem package_quantity = 30000 ml).
CREATE TABLE IF NOT EXISTS products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    brand_id INT NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    unit ENUM('unidade', 'grama', 'mililitro') NOT NULL,
    package_quantity DECIMAL(10,2) NOT NULL,
    min_stock DECIMAL(10,2) NULL,
    is_perishable BOOLEAN NOT NULL DEFAULT FALSE,
    is_residual BOOLEAN NOT NULL DEFAULT FALSE,  -- consumo residual (sal, açúcar...): não desconta por venda
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_products_name UNIQUE (brand_id, product_name),
    CONSTRAINT fk_products_brand
        FOREIGN KEY (brand_id) REFERENCES brands (brand_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- Que fornecedores vendem cada produto: um principal e os alternativos (RF11)
CREATE TABLE IF NOT EXISTS product_suppliers (
    product_id INT NOT NULL,
    supplier_id INT NOT NULL,
    is_main BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (product_id, supplier_id),
    CONSTRAINT fk_product_suppliers_product
        FOREIGN KEY (product_id) REFERENCES products (product_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_product_suppliers_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- Histórico de preços (RF11): cada preço novo é uma linha nova; os antigos nunca mudam.
-- O preço é por embalagem (ex.: o barril de 30 L custa 85 €).
CREATE TABLE IF NOT EXISTS product_prices (
    price_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    supplier_id INT NOT NULL,
    package_price DECIMAL(10,2) NOT NULL,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_prices_link
        FOREIGN KEY (product_id, supplier_id) REFERENCES product_suppliers (product_id, supplier_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_product_prices_user
        FOREIGN KEY (created_by) REFERENCES users (user_id)
) ENGINE=InnoDB;

-- Ementa de cada evento (RF08). Cada evento tem a sua: mudar um preço aqui não mexe nos outros eventos.
-- item_type: 'Direta' (ex.: cerveja de garrafa, fino) ou 'Composta' (ex.: Mojito, com receita).
CREATE TABLE IF NOT EXISTS menu_items (
    menu_item_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    category ENUM('Bebidas', 'Cocktails', 'Comida', 'Shots', 'Outros') NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    item_type ENUM('Direta', 'Composta') NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_menu_items_name UNIQUE (event_id, item_name),
    CONSTRAINT fk_menu_items_event
        FOREIGN KEY (event_id) REFERENCES events (event_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- O que sai do stock em cada venda de um artigo (RF09).
-- Venda direta: um só produto (ex.: fino = 220 ml do barril). Composto: a receita (ex.: Mojito).
-- A quantidade está na unidade base do produto (unidade, grama ou mililitro).
-- Num produto de consumo residual (sal, hortelã...) a quantidade pode ficar vazia.
CREATE TABLE IF NOT EXISTS menu_item_products (
    menu_item_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity DECIMAL(10,2) NULL,
    PRIMARY KEY (menu_item_id, product_id),
    CONSTRAINT fk_menu_item_products_item
        FOREIGN KEY (menu_item_id) REFERENCES menu_items (menu_item_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_menu_item_products_product
        FOREIGN KEY (product_id) REFERENCES products (product_id)
) ENGINE=InnoDB;

-- Compras de cada evento (RF12): antes ou durante o evento. Cada compra é de um fornecedor.
CREATE TABLE IF NOT EXISTS purchases (
    purchase_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    supplier_id INT NOT NULL,
    purchase_date DATE NOT NULL,
    notes VARCHAR(255) NULL,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchases_event
        FOREIGN KEY (event_id) REFERENCES events (event_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_purchases_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id),
    CONSTRAINT fk_purchases_user
        FOREIGN KEY (created_by) REFERENCES users (user_id)
) ENGINE=InnoDB;

-- Produtos de cada compra. Compra-se em embalagens (ex.: 3 barris a 85 € cada).
-- package_quantity guarda o tamanho da embalagem no dia da compra (o histórico não muda se o produto mudar);
-- quantity é o que entra no stock, na unidade base (3 x 30000 ml = 90000 ml).
CREATE TABLE IF NOT EXISTS purchase_lines (
    purchase_line_id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT NOT NULL,
    product_id INT NOT NULL,
    packages DECIMAL(10,2) NOT NULL,
    package_quantity DECIMAL(10,2) NOT NULL,
    package_price DECIMAL(10,2) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    CONSTRAINT uq_purchase_lines_product UNIQUE (purchase_id, product_id),
    CONSTRAINT fk_purchase_lines_purchase
        FOREIGN KEY (purchase_id) REFERENCES purchases (purchase_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_purchase_lines_product
        FOREIGN KEY (product_id) REFERENCES products (product_id)
) ENGINE=InnoDB;

-- Dias fechados (RF19). Se o dia tem uma linha aqui, está fechado: não aceita novos registos.
-- Reabrir apaga a linha; voltar a fechar cria outra.
CREATE TABLE IF NOT EXISTS day_closings (
    event_day_id INT PRIMARY KEY,
    closed_by INT NOT NULL,
    closed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_day_closings_day
        FOREIGN KEY (event_day_id) REFERENCES event_days (event_day_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_day_closings_user
        FOREIGN KEY (closed_by) REFERENCES users (user_id)
) ENGINE=InnoDB;

-- Vendas (RF14). Cada venda fica no dia operacional escolhido por quem regista (não pela hora do sistema).
-- item_name e unit_price são guardados no momento da venda: se a ementa mudar, a venda antiga não muda.
CREATE TABLE IF NOT EXISTS sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    event_day_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_by INT NULL,
    cancelled_at DATETIME NULL,
    CONSTRAINT fk_sales_event
        FOREIGN KEY (event_id) REFERENCES events (event_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_sales_day
        FOREIGN KEY (event_day_id) REFERENCES event_days (event_day_id),
    CONSTRAINT fk_sales_item
        FOREIGN KEY (menu_item_id) REFERENCES menu_items (menu_item_id),
    CONSTRAINT fk_sales_user
        FOREIGN KEY (created_by) REFERENCES users (user_id),
    CONSTRAINT fk_sales_cancelled_user
        FOREIGN KEY (cancelled_by) REFERENCES users (user_id)
) ENGINE=InnoDB;

-- Movimentos de stock (RF15, RF16, RF17): tudo o que muda o stock, exceto as compras.
-- quantity é negativa quando sai do stock (vendas, consumos, quebras...) e positiva quando entra.
-- As vendas criam um movimento por ingrediente, com a receita desse momento (o histórico não muda).
-- Nas correções manuais guarda-se a quantidade anterior, a nova e o motivo.
CREATE TABLE IF NOT EXISTS stock_movements (
    movement_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    product_id INT NOT NULL,
    event_day_id INT NULL,
    movement_type ENUM('Venda', 'Consumo interno', 'Oferta', 'Quebra', 'Desperdício', 'Correção', 'Devolução') NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    sale_id INT NULL,
    reason VARCHAR(255) NULL,
    previous_quantity DECIMAL(12,2) NULL,
    new_quantity DECIMAL(12,2) NULL,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_movements_event
        FOREIGN KEY (event_id) REFERENCES events (event_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_stock_movements_product
        FOREIGN KEY (product_id) REFERENCES products (product_id),
    CONSTRAINT fk_stock_movements_day
        FOREIGN KEY (event_day_id) REFERENCES event_days (event_day_id),
    CONSTRAINT fk_stock_movements_sale
        FOREIGN KEY (sale_id) REFERENCES sales (sale_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_stock_movements_user
        FOREIGN KEY (created_by) REFERENCES users (user_id)
) ENGINE=InnoDB;

-- Notas do evento (RF24): diárias (com event_day_id) ou finais (event_day_id vazio).
-- Ajudam a interpretar os resultados (ex.: choveu, faltou gelo). O impacto não é calculado.
CREATE TABLE IF NOT EXISTS event_notes (
    note_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    event_day_id INT NULL,
    note_type ENUM('Meteorologia', 'Afluência', 'Produtos esgotados', 'Excesso de stock', 'Fornecedores',
                   'Horário de maior movimento', 'Acontecimento externo', 'Outro') NOT NULL,
    note_text VARCHAR(500) NOT NULL,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_notes_event
        FOREIGN KEY (event_id) REFERENCES events (event_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_event_notes_day
        FOREIGN KEY (event_day_id) REFERENCES event_days (event_day_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_event_notes_user
        FOREIGN KEY (created_by) REFERENCES users (user_id)
) ENGINE=InnoDB;

-- Devoluções a fornecedores (RF22): só de embalagens fechadas e a fornecedores que aceitam devoluções.
-- A quantidade é confirmada por quem regista. O valor devolvido baixa o custo das compras.
-- movement_id liga ao movimento de stock que tirou as embalagens do stock.
CREATE TABLE IF NOT EXISTS purchase_returns (
    return_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    supplier_id INT NOT NULL,
    product_id INT NOT NULL,
    packages DECIMAL(10,2) NOT NULL,
    package_quantity DECIMAL(10,2) NOT NULL,
    package_price DECIMAL(10,2) NOT NULL,
    return_date DATE NOT NULL,
    movement_id INT NULL,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchase_returns_event
        FOREIGN KEY (event_id) REFERENCES events (event_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_purchase_returns_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers (supplier_id),
    CONSTRAINT fk_purchase_returns_product
        FOREIGN KEY (product_id) REFERENCES products (product_id),
    CONSTRAINT fk_purchase_returns_movement
        FOREIGN KEY (movement_id) REFERENCES stock_movements (movement_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_purchase_returns_user
        FOREIGN KEY (created_by) REFERENCES users (user_id)
) ENGINE=InnoDB;

-- Eventos encerrados (RF25). O encerramento é manual e só acontece com todos os dias fechados.
CREATE TABLE IF NOT EXISTS event_closings (
    event_id INT PRIMARY KEY,
    closed_by INT NOT NULL,
    closed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_closings_event
        FOREIGN KEY (event_id) REFERENCES events (event_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_event_closings_user
        FOREIGN KEY (closed_by) REFERENCES users (user_id)
) ENGINE=InnoDB;

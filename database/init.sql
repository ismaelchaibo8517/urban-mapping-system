-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS urban_problems_db;
USE urban_problems_db;

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de problemas
CREATE TABLE IF NOT EXISTS problems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category ENUM('Infraestrutura', 'Segurança', 'Limpeza', 'Transporte', 'Outros') NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    city ENUM('Chimoio', 'Beira') NOT NULL,
    status ENUM('reported', 'in_progress', 'resolved') DEFAULT 'reported',
    user_id INT,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Inserir usuário admin padrão (senha: Admin123!)
INSERT INTO users (name, email, password, role) VALUES 
('Administrador', 'admin@system.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Inserir alguns problemas de exemplo
INSERT INTO problems (title, description, category, latitude, longitude, city, status) VALUES 
('Buraco na Avenida', 'Grande buraco na avenida principal', 'Infraestrutura', -19.116394, 33.483333, 'Beira', 'reported'),
('Lâmpada queimada', 'Poste de luz não funciona', 'Infraestrutura', -19.116394, 33.483333, 'Beira', 'in_progress'),
('Lixo acumulado', 'Acúmulo de lixo na praça', 'Limpeza', -19.116394, 33.483333, 'Beira', 'reported');
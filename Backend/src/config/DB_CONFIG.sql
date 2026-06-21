-- =========================
-- TABLE ADMIN
-- =========================
CREATE TABLE admin (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    mot_de_passe TEXT
);

-- =========================
-- TABLE SERVICE
-- =========================
CREATE TABLE service (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100),
    description TEXT,
    temps_moyen FLOAT
);

-- =========================
-- TABLE FILE D'ATTENTE
-- =========================
CREATE TABLE file_attente (
    id SERIAL PRIMARY KEY,
    service_id INT REFERENCES service(id),
    capacite INT
);

-- =========================
-- TABLE AGENT
-- =========================
CREATE TABLE agent (
    id SERIAL PRIMARY KEY,
    admin_id INT REFERENCES admin(id),
    service_id INT REFERENCES service(id)
);

-- =========================
-- TABLE TICKET
-- =========================
CREATE TABLE ticket (
    id SERIAL PRIMARY KEY,
    numero INT,
    client_id INT REFERENCES admin(id),
    service_id INT REFERENCES service(id),
    statut VARCHAR(20) CHECK (statut IN ('EN_ATTENTE', 'EN_COURS', 'TERMINE', 'ANNULE')),
    heure_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    heure_appel TIMESTAMP,
    heure_fin TIMESTAMP,
    priorite INT DEFAULT 0
);

-- =========================
-- TABLE NOTIFICATION
-- =========================
CREATE TABLE notification (
    id SERIAL PRIMARY KEY,
    ticket_id INT REFERENCES ticket(id),
    message TEXT,
    date_envoi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- TABLE STATISTIQUE
-- =========================
CREATE TABLE statistique (
    id SERIAL PRIMARY KEY,
    service_id INT REFERENCES service(id),
    nb_clients INT,
    temps_moyen_attente FLOAT,
    date_stat DATE
);

-- Calcul du temps d’attente --
SELECT AVG(EXTRACT(EPOCH FROM (heure_appel - heure_creation))/60)
FROM ticket
WHERE service_id = 1;

-- Gestion de priorité --
ORDER BY priorite DESC, heure_creation ASC;

-- Numéro automatique par service --
SELECT COUNT(*) + 1 
FROM ticket 
WHERE service_id = 1;
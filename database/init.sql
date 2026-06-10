-- ENCODAGE: OBLIGATOIRE pour les accents (flexitbilité etc)
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE User
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS User (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50) NOT NULL UNIQUE,
    email       VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    weight      DECIMAL (5,2),
    goal        ENUM('lose', 'maintain', 'gain') DEFAULT 'maintain',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE Exercise
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS Exercise (
id              INT AUTO_INCREMENT PRIMARY KEY,
name            VARCHAR(100) NOT NULL,
category        ENUM('Musculation', 'Cardio', 'Flexibilité') NOT NULL,
muscle_group    VARCHAR(100),
description     TEXT,
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE Workout
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS Workout (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    title       VARCHAR(150) NOT NULL,
    date        DATE NOT NULL,
    duration    INT,
    notes       TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
)   ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE WorkoutExercise (jointure Many-to-Many)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS WorkoutExercise(
    id          INT AUTO_INCREMENT PRIMARY KEY,
    workout_id  INT NOT NULL,
    exercise_id INT NOT NULL,
    sets        INT,
    reps        INT,
    weight_used DECIMAL(6,2),
    duration    INT,
    FOREIGN KEY (workout_id) REFERENCES Workout(id) ON DELETE CASCADE
    FOREIGN KEY (exercise_id) REFERENCES Exercise(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- EXERCICES DE MUSCULATION (10)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO Exercise (name, category, muscle_group, description) VALUES
('Développé couché', 'Musculation', 'Pectoraux, TRICEPS, Epaules',
 'Allongé sur un banc, poussez la barre vers le haut.'),
('Squat barre', 'Musculation', 'Quadriceps, fessiers, Ischio-jambiers',
 "Barre sur les épaules, descendez jusqu'à ce que les cuisses soient parallèles."),
('Soulevé de terre', 'Musculation', 'Dos, Ischio-jambiers, Fessiers',
 'Tirez la barre du sol jusqu"à la position debout.'),
('Tractions', 'Musculation', 'Dos, Biceps',
 'Suspendez-vous à une barre et tirez jusqu"au menton.'),
('Développé militaire', 'Musculation', 'Epaules, Triceps',
 'Poussez la barre au-dessus de la tête debout ou assis.'),
('Rowing barre', 'Musculation', 'Dos, Biceps, Epaule arrière',
 'Penché en avant, tirez la barre vers le ventre.'),
('Curl biceps', 'Musculation', 'Biceps, Avant-bras',
 'Fléchissez les coudes pour amener les haltères vers les épaules.'),
('Extension triceps', 'Musculation', 'Triceps',
 'Bras tendus au-dessus, fléchissez les coudes derrière la tête.'),
('Legpress', 'Musculation', 'Quadriceps, Fessiers',
 'Poussez la plateforme avec les pieds sur la machine guidée.'),
('Gainage', 'Musculation', 'Abdominaux, Dos',
 'Tenez la position planche sur les avants-bras le plus longtemps possible.');

 -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- EXERCICES CARDIO (5)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO Exercise (name, category, muscle_group, description) VALUES
('Course à pied', 'Cardio', NULL,
 'Courir à allure modérée ou fractionnée.'),
('Vélo stationnaire', 'Cardio', NULL,
 'Pédalez à intensité variable.'),
('Corde à sauter', 'Cardio', NULL,
 'Saut coordonnés avec une corde.'),
('Rameur', 'Cardio', NULL,
 'Machine à ramer simulant l"aviron.'),
('Burpees', 'Cardio', NULL,
 'Enchaîner pompe, saut et position devout en continu.');
 -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- EXERCICES Flexibilité (5)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO Exercise (name, category, muscle_group, description) VALUES
('Etirements ischio-jambier', 'Flexibilité', 'Ischio-jambiers',
 'Assis jambes tendues, penchez-vous vers l"avant.'),
('Fente avant étirée', 'Flexibilité', 'Quadriceps, Fléchisseurs hanche',
 'Position de fente, genou arrière au sol.'),
('Etirement des épaules', 'Flexibilité', 'Epaules, Bras',
 'Croisez bras devant vous et tirez avec l"autre.'),
('Yoga', 'Flexibilité', 'Dos, Abdominaux',
 'A quatre pattes, alternez dos creusé et dos rond.'),
('Rotation du tronc', 'Flexibilité', 'Dos, Obliques',
 'Assis, tournez le buste de droite à gauche.');
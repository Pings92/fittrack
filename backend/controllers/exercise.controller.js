// ====================
// controllers/exercise.controller.js - Logique des exercices
//
// Le controleur orchestre : il valide les données recu
// appelle le modele pour acceder a la bdd et renvoie la réponse
// il ne contient jamais de sql - c'est le role du modele
// =================

const ExerciseModel = require('../models/exercise.model');

// liste des catégories autorisé (correspond à l'ENUM défini dans init.sql)
// centralisé ici pour éviter de la dupliquer dans chaque méthode
const VALID_CATEGORIES = ['Musculation', 'Cardio', 'Flexibilité'];

const ExerciseController = {

    // ------- GET /api/exercise?category=X&search=Y -------
    // Retourne la liste des exercice avec filtre optionnels
    async getAll(req, res) {
        try {
            // req.query contien les paramètre de l'URL après le ?
            // Ex: /api/exercises?category=Cardio&search=corde -W {category: 'Cardio}, search: 'corde}
            const {category, search} = req.query;

            //Validation de la catégorie AVANT d'appeler le modèle
            // pour éviter d'envoyer une requete SQL avec une valeur invalide
            if (category && !VALID_CATEGORIES.includes(category)) {
                return res.status(400).json({error :`Category must be one of : ${VALID_CATEGORIES.join(', ')}` });
            }

            const exercices = await ExerciseModel.findAll({ category, search});

            // On retourne auusi le count : utile côté frontend pour afficher "X exercices"
            res.json({ exercises, count: exercise.length });
        } catch (err) {
            console.error('GetAll exercises error:', err);
            res.status(500).json({error: 'Failed to fetch exercises.'});
        }
    },

    // ---- GET /api/exercises/id -----
    // req.params.id. contien le segment dynamique de l'URL (ex; exercises/42 -> id = "42")
    async getOne(req, res) {
        try {
            const exercise = await ExerciseModel.findById(req.param.id);
            if (!exercise) return res.status(404).json({error: 'Exercise not found'});
            // 404 - Not Found : la ressource demandé n'existe pas
            res.json({exercise});
        } catch (err) {
            res.status(500).json({error: 'Failed to fetch exercise.'});
        }
    },

    // ---Post /api/exercises ---
    //Crée un nouvel exercice. Requier name et category
}
//====================
// models/workout.model.js - Couche d'accès aux données
//                           (tables Workout et WorkoutExercise)
//
// Ce modèle gère deux tables liées : 
//  - Workout           : les séances d'entrainement
//  - WorkoutExercice   : table de jointure (exercices d'une séance)

const db = require('../config/database');

const WorkoutModel = {

    // - READ ALL : lister les séance de l'utilisateur
    async findAllByUser(userId) {
        const [rows] = await db.execute(
            // LEFT JOIN (pas INNER JOIN) : on récupère  les séances même si elles n'ont pas d'exercice | on garde les séances sans exercices
            // COUNT(we.id) : compte le nombre d'exercises associés à chaque séance
            // GROUP BY w.id nécessaire pour que COUNT() fonctionne par séance
            // ORDER BY date desc: les séances les plus récentes en premier
            `SELECT w.*,
                COUNT(we.id) as exercise_count
            FROM Workout w
            LEFT JOIN WorkoutExercise we ON w.id = we.workout_id
            WHERE w.user_id = ?
            GROUP BY w.id
            ORDER BY w.date DESC, w.created_at DESC`,
            [userId]
        );
        return rows;
    },

    //------------ Récupérer une séance avec tout ses exercices --------
    async findById(id, userId) {
        // On vérifie d'abord que la séance appartient à l'utilisateur (sécurité)
        // sans ce check, un utilisateur pourrait lire les séances d'un autre
        const [workouts] = await db.execute(
            `SELECT * FROM Workout WHERE id = ? AND user_id = ?`, 
            [id, userId]
        );
        if (!workouts[0]) return null;

        // Deuxième requête pour récupérer les exercices de la séance
        // JOIN Exercise : enrichit WorkoutExercise avec le nom/catégorie de l'exercice
        const [exercises] = await db.execute(
            `SELECT we.*, e.name, e.category, e.muscle_group
            FROM WorkoutExercise we
            JOIN Exercise e ON we.exercise_id =e.id
            WHERE we.workout_id =?
            ORDER BY we.id`,
            [id]
        );

        //Spread operator : fusion en un seul objet
        // {idn title, date, ... exercises: [{sets, reps, name, category, ...}] }
        return { ...workouts[0], exercises};
    },

    // -- CREATE : Créer une séance (sans exercices)
    async create({ user_id, title, date, duration, notes}) {
        const [result] = await db.execute (
            'INSERT INTO Workout (user_id, title, date, duration, notes) VALUES (?, ?, ?, ?, ?)',
            [user_id, title, date, duration || null, notes || null]
        );
        return result.insertId; // l'id de la séance crée
    },

    // -- CREATE: Ajouter un exercice à une séance
    async addExercise(workoutId, {exercise_id, sets, reps, weight_used, duration}) {
        // Insère une ligne dans un WorkoutExercise (table de jointure)
        // weight_used : poids utilisé en kg (peut petre null pour les exercices cardio)
        // duration : durée en secondes (pour les exercices cardio, pas de sets/reps)
        const [result] = await db.execute(
            'INSERT INTO WorkourExercise (workout_id, exercise_id, sets, reps, weight_used, duration)' +
            ' VALUES (?, ?, ?, ?, ?)',
            [workoutId, exercise_id, sets || null, reps || null, weight_used || null, duration || null] );
        return result.insertId;
    },

    // ---- UPDATE : modifier les stats d'un exercice dans une séance ----
    async updateExercise(weId, workoutId, {sets, reps, weight_used, duration}) {
        // On filtre aussi par workout_id : un utilisateur ne peut modifier
        // que les exercices de ses propres séances
        await db.execute(
            'UPDATE WorkoutExercise +  SET sets=?, reps=?, weight_used=?, duration=? +  WHERE id=? AND workout_id=?',
            [sets || null, reps || null, weight_used || null, duration || null, weId, workoutid]
        );
    },

    //DELETE : Retirer un exercice d'une séance
    async removeExercice(weId, workoutId) {
        const [result] = await db.execute (
            'DELETE FROM WorkoutExercise WHERE id=? AND workout_id=?',
            [weId, workoutId]
        );
        return result.affectedRows > 0;
    },

    // --- REPLACE: remplacer tous les exercices d'une séances-----
    // Utilisé lors d'un PUT /workouts/:id : on supprime tout et on réinsère/ Stratégie : DELETE tout + INSERT les nouveaux.
    // Plus simple que de calculer le différences (ajouts/suppressions/modifs).
    async replaceExercises(workout_id, exercises) {
        await db.execute('DELETE FROM WorkoutExercise WHERE workout_id = ?',[workoutId]);
        for(const ex of exercises){
            if (!ex.exercise_id) continue;
            await this.addExercise(workoutId, ex);
        }
    },

    //UPDATE modifier les infos d'une séance (mise à jour partielle)
    async update(id, userId, {title, date, duration, notes}) {
        const fields = [];
        const values = [];

        if (title !== undefined) { fields.push('title = ?'); values.push(title);}
        if (date !== undefined) { fields.push('date = ?'); values.push(date);}
        if (duration !== undefined) { fields.push('duration = ?'); values.push(duration);}
        if (notes !== undefined) { fields.push('notes = ?'); values.push(notes);}
        
        if (fields.length === 0) return this.findById(id, userId);

        // On passe id ET userId dans le WHERE pour s'assurer que l'utilisateur ne peut modifer que ses propres séances (isolation des données)
        //WHERE id =? and user_id = ? : double sécurité -- même avec le bon id, un autre utilisateur ne peut pas modifier cette séance
        values.push(id, userId);
        await db.execute(`UPDATE Workout SET ${fields.join(', ')} WHERE id = ?AND user_id = ?`,values);
        return this.findById(id, userId);
    },

    //-- DELETE: Supprimer une séance
    async delete(id, userId){
        const [result] = await db.execute(`DELETE FROM Workout WHERE id = ? AND user_id =?`,[id, userId]);
        // Les WorkoutExercise associées sont supprimées AUTOMATIQUEMENT grâce à al contraine ON DELETE CASCADE définie dans init.sql. Pas besoin de DELETE explicite sur WorkoutExercice.
        return result.affectedRows > 0;
    },
}
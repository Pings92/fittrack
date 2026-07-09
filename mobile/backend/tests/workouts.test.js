//
//
//
//
//
//
//
//

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../config/database', () => ({
    execute: jest.fn(),
    getConnection: jest.fn().mockResolvedValue({ release: jest.fn() }),
    query: jest.fn(),
}));

//
jest.mock('../models/workout.model', () => ({
    findAllByUser : jest.fn(),
    findById : jest.fn(),
    create : jest.fn(),
    addExercise: jest.fn(),
    updateExercise: jest.fn(),
    removeExercise: jest.fn(),
    replaceExercises: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getProgressionStats: jest.fn(),
}));

const app = require('../server');
const WorkoutModel = require('../models/workout.model');

//
const authHeader = () => ({
    Authorization: `Bearer ${jwt.sign(
        {id: 1, email :  'test@example.com', username: 'testuser'},
        process.env.JWT_SECRET,
        {expiresIn: '1d'}
    )}`,
});

//
const BASE_WORKOUT ={
    id: 1,
    user_id : 1,
    title: 'Séance du lundi',
    date: '2024-01-15',
    duration: 60,
    notes : null,
    created_at: '2024-01-15T00:00:00:000Z',
    updated_at: '2024-01-15T00:00:00:000Z',
    exercises: [], //findbyid retourne toujours le champs exercises
};

describe('Workout Routes', () => {
    beforeEach(() => {
    jest.clearAllMocks();
    });

    //
    describe('GET /api/workouts', () => {
    //

        it("retourne les séances de l'utilisateur (200)", async () => {
            //
            WorkoutModel.findAllByUser.mockResolvedValue([BASE_WORKOUT]);
        
            const res = await request(app)
                .get('/api/workouts')
                .set(authHeader());

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('workouts');
            expect(res.body.count).toBe(1);
            expect(res.body.workouts[0].title).toBe('Séance du lundi');
        });

        it('retourne 401 sans token', async () => {
        //
            const res = await request(app).get('/api/workouts');

            expect(res.status).toBe(401);
        });

        it("retourne un tableau vide si aucune séance", async () => {
        //
            WorkoutModel.findAllByUser.mockResolvedValue([]);

            const res = await request(app)
                .get('/api/workouts')
                .set(authHeader());

            expect(res.status).toBe(200);
            expect(res.body.workouts).toEqual([]);//
            expect(res.body.count).toBe(0);
        });
    });

        //=============
    describe('POST /api/workouts', () => {
    //

        it('crée une séance avec succès(201)', async () => {
        //
            WorkoutModel.create.mockResolvedValue(1);
            WorkoutModel.findById.mockResolvedValue(BASE_WORKOUT);

            const res = await request(app)
                .post('/api/workouts')
                .set(authHeader())
                .send({title: 'Séance du lundi', date: '2024-01-15', duration: 60});
        
            expect(res.status).toBe(201);
            expect(res.body.message).toBe('Workout created.');//
            expect(res.body.workout.title).toBe('Séance du lundi');
        });

        it('Retourne 400 si title est manquant', async () => {
            const res = await request(app)
                .post('/api/workouts')
                .set(authHeader())
                .send({date: '2024-01-15'});

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Title and date are required.');//
        });

        it('Retourne 400 si date est manquant', async () => {
            const res = await request(app)
                .post('/api/workouts')
                .set(authHeader())
                .send({Title: 'Test'}); //date manquante

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Title and date are required.');//
        });

        it('Crée une séance avec des exos', async () => {
            WorkoutModel.create.mockResolvedValue(1);
            //
            WorkoutModel.addExercise.mockResolvedValue(undefined);
            WorkoutModel.findById.mockResolvedValue({
                ...BASE_WORKOUT,
                exercises: [{exercise_id: 1, set: 3, reps: 10, weight_used: 50 }],
            });

            const res = await request(app)
                .post('/api/workouts')
                .set(authHeader())
                .send({
                    title: 'Full body',
                    date: '2024-01-15',
                    exercises: [{exercise_id: 1, set: 3, reps: 10, weight_used: 50 }],
                }); 

            expect(res.status).toBe(201);
            //
            //
            expect(WorkoutModel.addExercise).toHaveBeenCalledTimes(1);//
        });
    });

        //
    describe('DELETE /api/workout/:id', () => {
    //

        it('supprime une séance avec succes (200)', async () => {
            //delete
            WorkoutModel.delete.mockResolvedValue(1);

            const res = await request(app)
                .delete('/api/workouts/1')
                .set(authHeader());

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Workout deleted.');//
        });

        it('Retourne 404 si la séance n"existe pas', async () => {
            //delete
            WorkoutModel.delete.mockResolvedValue(0);

            const res = await request(app)
                .delete('/api/workouts/999')
                .set(authHeader());

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Workout not found.');//
        });
        
        it('retourne 401 sans token', async () => {
            const res = await request(app).delete('/api/workouts/1');

            expect(res.status).toBe(401);
        });
    });
})
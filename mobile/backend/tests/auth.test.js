// ============================================================
// tests/auth.test.js — Tests d'intégration des routes d'authentification
//
// Stratégie de test :
//   1. On "mocke" la base de données et les models pour éviter de toucher
//      une vraie BDD pendant les tests (tests rapides, isolés, reproductibles).
//   2. Supertest simule des requêtes HTTP sans démarrer un vrai serveur.
//   3. Pour chaque test, on contrôle ce que les mocks retournent avec
//      mockResolvedValue() ou mockRejectedValue().
// ============================================================

const request = require('supertest');
const jwt = require('jsonwebtoken');

// ---- Mock de la base de données ----
// jest.mock() remplace l'import réel par un faux objet contrôlé.
// Ici, db.execute/getConnection/query ne font jamais de vraie connexion SQL.
// Doit être déclaré AVANT d'importer server (qui importe lui-même les models).
jest.mock('../config/database', () => ({
  execute: jest.fn(),
  getConnection: jest.fn().mockResolvedValue({ release: jest.fn() }),
  query: jest.fn(),
}));

// ---- Mock du modèle User ----
// Chaque méthode est remplacée par jest.fn() : une fonction espion qui
// ne fait rien par défaut, mais qu'on peut configurer dans chaque test.
jest.mock('../models/user.model', () => ({
  create: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
  findByUsername: jest.fn(),
  verifyPassword: jest.fn(),
  update: jest.fn(),
}));

// L'app est importée APRÈS les mocks pour que le code utilise les faux modules
const app = require('../server');
const UserModel = require('../models/user.model');

// Objet utilisateur de test réutilisé dans plusieurs cas de test
const BASE_USER = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  weight: null,
  goal: 'maintain',
  created_at: '2024-01-01T00:00:00.000Z',
};

// Fonction utilitaire pour générer un JWT valide en test
const generateToken = (payload = {}) =>
  jwt.sign(
    { id: 1, email: 'test@example.com', username: 'testuser', ...payload },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

describe('Auth Routes', () => {
  // beforeEach s'exécute AVANT chaque test du describe
  // clearAllMocks remet tous les mocks à zéro : compteurs d'appels,
  // valeurs de retour configurées, etc. Évite les effets de bord entre tests.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================================================
  describe('POST /api/auth/register', () => {
  // ==================================================

    it('crée un compte avec succès (201)', async () => {
      // mockResolvedValue(null) : findByEmail retourne null → email disponible
      UserModel.findByEmail.mockResolvedValue(null);
      UserModel.findByUsername.mockResolvedValue(null);
      // mockResolvedValue(1) : create retourne l'id 1 (insertId simulé)
      UserModel.create.mockResolvedValue(1);
      UserModel.findById.mockResolvedValue(BASE_USER);

      // request(app).post(url).send(body) simule un POST avec body JSON
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      // toHaveProperty vérifie la présence d'une clé (sans vérifier la valeur)
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.message).toBe('Account created successfully.');
    });

    it('retourne 400 si username manquant', async () => {
      // Pas besoin de configurer les mocks : la validation échoue avant d'appeler le modèle
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Username, email and password are required.');
    });

    it('retourne 400 si email manquant', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Username, email and password are required.');
    });

    it('retourne 400 si mot de passe < 6 caractères', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', email: 'test@example.com', password: '12345' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Password must be at least 6 characters.');
    });

    it('retourne 409 si email déjà utilisé', async () => {
      // mockResolvedValue(BASE_USER) : findByEmail retourne un user → email pris
      UserModel.findByEmail.mockResolvedValue(BASE_USER);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'newuser', email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(409); // 409 = Conflict
      expect(res.body.error).toBe('Email already in use.');
    });

    it('retourne 409 si username déjà pris', async () => {
      UserModel.findByEmail.mockResolvedValue(null);
      // findByUsername retourne { id: 2 } → username pris par un autre user
      UserModel.findByUsername.mockResolvedValue({ id: 2 });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', email: 'new@example.com', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Username already taken.');
    });
  });

  // ==================================================
  describe('POST /api/auth/login', () => {
  // ==================================================

    it('connecte avec succès (200)', async () => {
      // findByEmail doit retourner un user AVEC le password (pour la vérification bcrypt)
      const userWithPassword = { ...BASE_USER, password: 'hashed_password' };
      UserModel.findByEmail.mockResolvedValue(userWithPassword);
      // verifyPassword retourne true → mot de passe correct
      UserModel.verifyPassword.mockResolvedValue(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      // Le mot de passe ne doit JAMAIS apparaître dans la réponse
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.message).toBe('Login successful.');
    });

    it('retourne 400 si champs manquants', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' }); // password absent

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email and password are required.');
    });

    it('retourne 401 si email inexistant', async () => {
      UserModel.findByEmail.mockResolvedValue(null); // email non trouvé

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@example.com', password: 'password123' });

      expect(res.status).toBe(401); // 401 = Non authentifié
      // Même message que pour mauvais mot de passe → sécurité (anti-énumération)
      expect(res.body.error).toBe('Invalid credentials.');
    });

    it('retourne 401 si mot de passe incorrect', async () => {
      const userWithPassword = { ...BASE_USER, password: 'hashed_password' };
      UserModel.findByEmail.mockResolvedValue(userWithPassword);
      UserModel.verifyPassword.mockResolvedValue(false); // mot de passe incorrect

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials.');
    });
  });

  // ==================================================
  describe('GET /api/auth/me', () => {
  // ==================================================

    it('retourne le profil avec un token valide (200)', async () => {
      UserModel.findById.mockResolvedValue(BASE_USER);
      const token = generateToken();

      const res = await request(app)
        .get('/api/auth/me')
        // .set() ajoute un header : ici le JWT Bearer pour s'authentifier
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('retourne 401 sans token', async () => {
      // Aucun header Authorization → authMiddleware refuse
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('retourne 401 avec un token invalide', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
    });
  });
});
// ============================================================
// tests/setup.js — Configuration de l'environnement de test
//
// Ce fichier est chargé AVANT chaque fichier de test, comme
// défini dans jest.config.js (setupFiles: ['./tests/setup.js']).
// Son rôle : injecter les variables d'environnement nécessaires
// pour que le code testé fonctionne sans vraie base de données.
// ============================================================

// JWT_SECRET doit être présent pour que jwt.sign() et jwt.verify()
// fonctionnent dans les tests. Peu importe sa valeur en test,
// l'essentiel est qu'elle soit cohérente entre la signature et la vérification.
process.env.JWT_SECRET = 'test-jwt-secret-fittrack-testing-key-256bits';

process.env.JWT_EXPIRES_IN = '1d';

// NODE_ENV=test est utilisé dans server.js pour NE PAS démarrer
// le serveur HTTP (app.listen). Supertest crée son propre serveur temporaire.
process.env.NODE_ENV = 'test';
// //
// //test/setup configuration de l'environnement de test

// ce fichier est chargé avant chaque fichier de test, Comment
// défini dans JsonWebTokenError.config.js (setupFiles: ['./test/setup.js']).
// son role: injecter les variables d'environnement nécessaires
// pour que le code testé fonctionne sans vrai base de données
//

// JWT_SECRET doit être présent pour que jwt.sign() et jwt.verify()
// fonctionnnent dans les tests Peu importe sa valeur en test,
// l'essentiel est qu'elle soit cohérente entre la signature et la vérification
process.env.JWT_SECRET= 'test-jwt-secret-fittrack-testing-key-256bits'

process.env.JWT_EXPIRES_IN = 'id'

//NODE_ENV=test est utilisé dans server;js pour ne pas démarrer
// le serveut http (app.listenà. supertest crée son propre serveur temporaire)
process.env.NODE_ENV = 'test'
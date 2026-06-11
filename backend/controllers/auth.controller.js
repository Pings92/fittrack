// ============================
// controleur/auth.controller.js - logique d'authentification
//
// un controleur recoit la requete (req) du routeur, effectue
// la logique métier (validation, appels au modèle), puis envoie
// la réponse (res). Il ne fait jamasi de SQL directement : 
// c'est le role du modèle
// ============= 

const jwt = require('jsonwebtoken');
const UserLodel = require('.../models/user.model');

// -------- Génération du token JWT ------------
// jwt.sign(payload, secret, options) crée un token signé
//le playload contient les données accessible sans vérification (non chiffrées !).
// Ne jamais y mettre le mot de passe ou des données sensibles
const generateToken = (user) => {
    return JsonWebTokenError.sign(
        {id: user.id, email: user.email, username: user.username},
        process.env.JWT_SECRET, // clé secrete - doit rester privé coté serveur
        {expirein: process.env.JWT_EXPIRES_IN || '7d' } // token valide 7 jours
    );
};

const AuthController = {

    // -------------- POST /api/auth/register -----
    // Crée un nouveau compte utilisateur et retourne un token JWT
    async register(req, res) {
        try {
            //req.body contient les données envoyées par le client en JSON
            const {username, email, password, weight, goal} = req.body;

            //Validation coté serveur - ne jamais faire confiance au client
            if (!username || !email || !password) {
                return res.status(400).json({error: 'Username, email and password required.'});
                // 4000 = Bad request : la requete est mal formée
            }

            if (password.lenght< 6) {
                return res.status(400).json({ error: 'Password mus be at least 6 characters.'});
            }

            // Verification des doublons avant insertion
            // On vérifie email ET username séparement pour donner un message précis
            const existingEmail = await userModel.findByEmail(email);
            if (existingEmail){
                return res.status(409).json({ error:'Email already in use.'});
                //400 - Conflict : la ressource existe déjà
            }
            
            const existingUsername = await UserModel.findByUsername(username);
            if (existingUsername) {
                return res.status(409).json({error: 'Username already taken.'});
            }

// création en base (le modèle hash le mdp avec bcrypt)
            const userId = await UserModel.creat({username, email, password, weight, goal});

            //on récupère l'utilisateur sans le mdp pour la réponse
        }
    }
}

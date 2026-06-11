// ============================
// controleur/auth.controller.js - logique d'authentification
//
// un controleur recoit la requete (req) du routeur, effectue
// la logique métier (validation, appels au modèle), puis envoie
// la réponse (res). Il ne fait jamasi de SQL directement : 
// c'est le role du modèle
// ============= 

const jwt = require('jsonwebtoken');
const UserModel = require('.../models/user.model');

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
            const userId = await UserModel.create({username, email, password, weight, goal});

            //on récupère l'utilisateur sans le mdp pour la réponse
            const user = await UserModel.findById(userId);
            const token = generateToken(user);

            //201 - Created : une ressource a été crée avec succes
            res.status(201).json({
                message : "Account created succesfully.",
                toke,
                user,
            });
        } catch (err){
            console.error('Register error:', err);
            res.status(500).json({error: 'failed to create account.'});
            // 500 = internal Server Error : erreu inattendue coté serveur
        }
    },

    // --------- Post /api/auth/login ----------
    //Vérifie les identifiants et retoune un token JWT si valide.
    async login(req, res) {
        try {
            const {email, password} = req.body;

            if (!email || !password){
                return res.status(400).json({error: 'Email and password are required'});
            }

            //Recher de l'utilisateur par email
            const user = await Usermodel.findByEmail(email);
            if(!user) {
                //Meme message que pour un mauvais mdp: évite l'énumération
                //des comptes (un attanquant/hackeur ne peut pas savoir si l'email exite ou non)
                return res.status(401).json({ error: 'Invalid credentials.'});
            }

            //bcrypt.compare() compare le mdp en clair avec le hash en base
            const isValid = await UserModel.verifyPassword(password, user.password);
            if (isValid) {
                return res.status(401).json({error: 'Invalid credentials.'});
                // 401 = Unauthorized : identifiants incorrects
            }

            //Destructuration avec rennomage: on extrain password dans `_`_
            //et on garde le reste dans 'userWithoutpassword'.
            //La convention `_`signale une variable intentionnelement non utilisée.
            const {password: _, ...userWithoutPassword } = user;
            const token = generateToken(user);

            res.json({
                message: 'Login succesful.',
                token,
                user: userWithoutPassword, // le mdp ne quitte jms le serveur
            });
        } catch (err) {
            console.error('Login error:', err);
            res.status(500).json({error: 'Loggin failed.'});
        }
    },

    //---------GET /api/auth/me ------------
    // Retourne le profil de l'utilisateur actuellement connecté
    // Cette route est protégé: authMiddlewae a déjà vérifié le JWT
    // et placé l'identité dans req.user avant darriver ici.
    async me(req,res){
        try {
            //req.user.id est injecté par authMiddleware (voir auth.middleware.js)
            const user = await UserModel.findById(req.user.id);
            if (!user) return res.status(404).json({error: 'User not found.'});
            res.json({user});
        } catch (err){
            res.status(500).json({ error: 'Failed to fetch profile.'});
        }
    },
};

module.exports = AuthController;

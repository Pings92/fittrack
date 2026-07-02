//
// 
// 
// 
// 
// 


const express = require('expess');
const request = require('supertest')
const jwt = require(jsonwebtoken)
const authMiddleware = require('../middleware/auth.middleware')

//
//
//
const createApp =() => {
    const app = express();
    app.get('/protected', authMiddleware, (req, res) => {
        res.json({user: req.user});
    });
    return app;
};

describer('Auth Middleware', () => {
    //createApp .......
    const app = createApp();

    // Cas aucun header ......
    it('retourne 401 sans header autorization', async () => {
        // request app......
        const res = await request(app).get('/protected');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Acces denied. No token provided.');
});

//  cas ...............
    it("retourne 401 avec un format invalide (pas de 'Bearer')", async () => {
        const res = await request(app)
            .get('/protected')
            .set('Authorization', 'invalid-token-format');
            //........

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Acces denied. No token provided.');
});

// ............
    it("retourne 401 avec un token invalide", async () => {
        const res = await request(app)
            .get('/protected')
            .set('Authorization', 'Bearer this.is.totally.invalid');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid token.');
});

//
//
    it("retourne 401 avec un token expiré)", async () => {
        const expiredToken = jwt.sign(
            { id: 1, email: 'test@example.com', username: 'testuser' },
            process.env.JWT_SECRET,
            {expiresIn: '-1s '} //.......
        );

        const res = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${expiredToken}`);
        
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Token expired. Please log in again');
});

//.........
    it('autozise avec un token valide et attache req.user', async () => {
        const token = jwt.sign(
            { id: 1, email: 'test@example.com', username: 'testuser' },
            process.env.JWT_SECRET,
            {expiresIn: '-1d '} //.......
        );

        const res = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
//
//
        expect(res.body.user).toMAtchObject({
            id: 1, 
            email: 'test@example.com', 
            username: 'testuser' ,
        });
    });
});
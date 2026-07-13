require('dotenv').config();
const express = require('express');
const nunjucks = require('nunjucks');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { sequelize, User, Ride, RideRequest, KarmaTransaction } = require('./models');
const { Op } = require('sequelize');

const app = express();

// Parse form bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Middleware
app.use(session({
    secret: 'karma-super-secret-key-123',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'static')));

// Setup Nunjucks
const env = nunjucks.configure('templates', {
    autoescape: true,
    express: app
});

env.addFilter('formatDate', function(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
});

app.set('view engine', 'html');

// Sync DB
sequelize.sync({ alter: true }).then(async () => {
    console.log("Database synced!");
}).catch(err => {
    console.error("Database sync failed:", err);
});

// --- AUTH MIDDLEWARE ---
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}

async function getCurrentUser(req) {
    if (!req.session.userId) return null;
    return await User.findByPk(req.session.userId);
}

// Pass user to all templates
app.use(async (req, res, next) => {
    res.locals.user = await getCurrentUser(req);
    next();
});

// --- AUTH ROUTES ---

app.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/');
    res.render('login.html');
});

app.post('/login', async (req, res) => {
    const { phone, password } = req.body;
    const user = await User.findOne({ where: { phone } });
    
    if (user && await bcrypt.compare(password, user.password_hash)) {
        req.session.userId = user.id;
        return res.redirect('/');
    }
    res.render('login.html', { error: 'Invalid phone or password' });
});

app.get('/register', (req, res) => {
    if (req.session.userId) return res.redirect('/');
    res.render('register.html');
});

app.post('/register', async (req, res) => {
    const { name, phone, password } = req.body;
    
    // Check if exists
    const existing = await User.findOne({ where: { phone } });
    if (existing) {
        return res.render('register.html', { error: 'Phone number already registered' });
    }
    
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
        name,
        phone,
        password_hash,
        karma_balance: 50
    });
    
    req.session.userId = user.id;
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// --- MAIN ROUTES (Protected) ---

app.get('/', requireAuth, async (req, res) => {
    const user = res.locals.user;
    const active_rides = await Ride.findAll({ where: { helper_id: user.id } });
    const requests_made = await RideRequest.findAll({ 
        where: { seeker_id: user.id },
        include: [{ model: Ride, as: 'ride' }]
    });

    res.render('dashboard.html', {
        active_rides: active_rides,
        requests_made: requests_made
    });
});

app.get('/offer', requireAuth, (req, res) => {
    res.render('offer_ride.html');
});

app.post('/api/rides', requireAuth, async (req, res) => {
    const user = res.locals.user;
    const { source, destination, date_time_str, karma_reward } = req.body;
    
    await Ride.create({
        helper_id: user.id,
        source: source,
        destination: destination,
        date_time: new Date(date_time_str),
        karma_reward: parseInt(karma_reward)
    });
    
    res.redirect('/');
});

app.get('/find', requireAuth, async (req, res) => {
    const user = res.locals.user;
    const available_rides = await Ride.findAll({
        where: {
            status: 'open',
            helper_id: { [Op.ne]: user.id }
        },
        include: [{ model: User, as: 'helper' }]
    });

    res.render('find_ride.html', { rides: available_rides });
});

app.post('/api/request/:ride_id', requireAuth, async (req, res) => {
    const user = res.locals.user;
    const ride_id = req.params.ride_id;
    
    const ride = await Ride.findByPk(ride_id);
    if (!ride || ride.status !== 'open') {
        return res.status(400).send("Ride not available");
    }
    
    if (user.karma_balance < ride.karma_reward) {
        return res.status(400).send("Insufficient Karma Points");
    }
    
    // Deduct Karma
    user.karma_balance -= ride.karma_reward;
    await user.save();
    
    // Create Escrow Transaction
    await KarmaTransaction.create({
        sender_id: user.id,
        receiver_id: ride.helper_id,
        amount: ride.karma_reward,
        ride_id: ride.id,
        status: "escrow"
    });
    
    // Create Ride Request
    await RideRequest.create({
        ride_id: ride.id,
        seeker_id: user.id
    });
    
    // Update ride status
    ride.status = "matched";
    await ride.save();
    
    res.redirect('/');
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

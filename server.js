require('dotenv').config();
const express = require('express');
const nunjucks = require('nunjucks');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sequelize, User, Ride, RideRequest, KarmaTransaction, Message } = require('./models');

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

async function requireAdmin(req, res, next) {
    if (!req.session.userId) {
        return res.status(403).send("Unauthorized");
    }
    const user = await User.findByPk(req.session.userId);
    const adminPhone = process.env.ADMIN_PHONE;
    if (!user || !adminPhone || user.phone !== adminPhone) {
        return res.status(403).send("Unauthorized");
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
    const active_rides = await Ride.findAll({ 
        where: { helper_id: user.id },
        include: [{ 
            model: RideRequest, 
            as: 'requests',
            include: [{ model: User, as: 'seeker' }]
        }]
    });
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

app.post('/api/rides/:ride_id/cancel', requireAuth, async (req, res) => {
    const ride = await Ride.findByPk(req.params.ride_id, {
        include: [{ model: RideRequest, as: 'requests' }]
    });

    if (!ride) return res.status(404).send("Ride not found");
    if (ride.helper_id !== res.locals.user.id) return res.status(403).send("Unauthorized");

    if (ride.status === 'cancelled') return res.redirect('/');

    // Refund Karma for any pending or accepted requests
    if (ride.requests) {
        for (const request of ride.requests) {
            if (request.status === 'pending' || request.status === 'accepted') {
                const seeker = await User.findByPk(request.seeker_id);
                if (seeker) {
                    seeker.karma_balance += ride.karma_reward;
                    await seeker.save();
                }
                
                await KarmaTransaction.update(
                    { status: 'refunded' },
                    { where: { ride_id: ride.id, sender_id: request.seeker_id, status: 'escrow' } }
                );

                request.status = 'cancelled';
                await request.save();
            }
        }
    }

    ride.status = 'cancelled';
    await ride.save();

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
    const ride = await Ride.findByPk(req.params.ride_id);
    if (!ride) return res.status(404).send("Ride not found");

    if (res.locals.user.karma_balance < ride.karma_reward) {
        return res.status(400).send("Not enough karma");
    }

    // Deduct Karma and Create Escrow
    const seeker = await User.findByPk(res.locals.user.id);
    seeker.karma_balance -= ride.karma_reward;
    await seeker.save();

    await KarmaTransaction.create({
        sender_id: seeker.id,
        receiver_id: ride.helper_id,
        amount: ride.karma_reward,
        ride_id: ride.id,
        status: 'escrow'
    });

    await RideRequest.create({
        ride_id: ride.id,
        seeker_id: seeker.id
    });

    res.redirect('/');
});

app.post('/api/request/:request_id/accept', requireAuth, async (req, res) => {
    const request = await RideRequest.findByPk(req.params.request_id, {
        include: [{ model: Ride, as: 'ride' }]
    });

    if (!request) return res.status(404).send("Request not found");
    if (request.ride.helper_id !== res.locals.user.id) return res.status(403).send("Unauthorized");

    // Update request and ride status
    request.status = 'accepted';
    await request.save();

    request.ride.status = 'matched';
    await request.ride.save();

    // Reject all other pending requests for this ride
    await RideRequest.update(
        { status: 'rejected' },
        { 
            where: { 
                ride_id: request.ride.id, 
                id: { [Op.ne]: request.id },
                status: 'pending'
            } 
        }
    );

    res.redirect('/');
});

app.get('/ride/:ride_id/chat', requireAuth, async (req, res) => {
    const ride = await Ride.findByPk(req.params.ride_id, {
        include: [
            { model: User, as: 'helper' },
            { model: RideRequest, as: 'requests', where: { status: 'accepted' }, include: [{ model: User, as: 'seeker' }], required: false },
            { model: Message, as: 'messages', include: [{ model: User, as: 'sender' }] }
        ]
    });

    if (!ride) return res.status(404).send("Ride not found");

    const acceptedReq = ride.requests && ride.requests.length > 0 ? ride.requests[0] : null;
    if (!acceptedReq) return res.status(403).send("Ride is not matched yet");

    const isHelper = ride.helper_id === res.locals.user.id;
    const isSeeker = acceptedReq.seeker_id === res.locals.user.id;

    if (!isHelper && !isSeeker) return res.status(403).send("Unauthorized");

    const otherPerson = isHelper ? acceptedReq.seeker : ride.helper;

    res.render('chat.html', {
        ride,
        otherPerson,
        messages: ride.messages
    });
});

app.post('/ride/:ride_id/chat', requireAuth, async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Empty message" });

    const msg = await Message.create({
        ride_id: req.params.ride_id,
        sender_id: res.locals.user.id,
        content: content
    });

    const fullMsg = await Message.findByPk(msg.id, {
        include: [{ model: User, as: 'sender' }]
    });

    res.json({ success: true, message: fullMsg });
});

app.get('/api/ride/:ride_id/messages', requireAuth, async (req, res) => {
    const ride = await Ride.findByPk(req.params.ride_id, {
        include: [
            { model: Message, as: 'messages', include: [{ model: User, as: 'sender' }] }
        ]
    });
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    
    // Sort messages by creation time
    const sortedMessages = ride.messages.sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
    res.json({ messages: sortedMessages });
});

// --- ADMIN ROUTES ---
app.get('/secret-admin-panel', requireAdmin, async (req, res) => {
    const users = await User.findAll({ order: [['id', 'DESC']] });
    const rides = await Ride.findAll({ 
        include: [{ model: User, as: 'helper' }],
        order: [['id', 'DESC']] 
    });
    const transactions = await KarmaTransaction.findAll({
        include: [
            { model: User, as: 'sender' },
            { model: User, as: 'receiver' }
        ],
        order: [['timestamp', 'DESC']],
        limit: 50
    });

    res.render('admin.html', {
        all_users: users,
        all_rides: rides,
        recent_transactions: transactions
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

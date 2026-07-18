require('dotenv').config();
const express = require('express');
const nunjucks = require('nunjucks');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sequelize, User, Ride, RideRequest, KarmaTransaction, Message, Notification } = require('./models');

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
        console.log("Admin Panel Blocked: User is not logged in.");
        return res.status(403).send("Unauthorized: Please log in first.");
    }
    const user = await User.findByPk(req.session.userId);
    const adminPhone = process.env.ADMIN_PHONE;

    if (!adminPhone) {
        console.log("Admin Panel Blocked: ADMIN_PHONE is not set in environment variables.");
        return res.status(403).send("Unauthorized: Admin is not configured. Did you forget to set ADMIN_PHONE?");
    }

    if (!user || user.phone !== adminPhone) {
        console.log(`Admin Panel Blocked: Logged in phone (${user ? user.phone : 'unknown'}) does not match ADMIN_PHONE.`);
        return res.status(403).send("Unauthorized: Your phone number does not match the Admin phone number.");
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

// --- NOTIFICATION ROUTES ---
app.get('/api/notifications', requireAuth, async (req, res) => {
    const notifications = await Notification.findAll({
        where: { user_id: req.session.userId },
        order: [['timestamp', 'DESC']],
        limit: 20
    });
    res.json(notifications);
});

app.post('/api/notifications/:id/read', requireAuth, async (req, res) => {
    const notif = await Notification.findByPk(req.params.id);
    if (notif && notif.user_id === req.session.userId) {
        notif.is_read = true;
        await notif.save();
    }
    res.sendStatus(200);
});

app.post('/api/notifications/read_all', requireAuth, async (req, res) => {
    await Notification.update(
        { is_read: true },
        { where: { user_id: req.session.userId, is_read: false } }
    );
    res.sendStatus(200);
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
    const { name, phone, email, password } = req.body;
    
    // Check if exists
    const existing = await User.findOne({ where: { phone } });
    if (existing) {
        return res.render('register.html', { error: 'Phone number already registered' });
    }

    if (email && email.trim() !== '') {
        const existingEmail = await User.findOne({ where: { email: email.trim() } });
        if (existingEmail) {
            return res.render('register.html', { error: 'Email already registered' });
        }
    }
    
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
        name,
        phone,
        email: email && email.trim() !== '' ? email.trim() : null,
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

app.post('/api/rides/:id/complete', requireAuth, async (req, res) => {
    const rideId = req.params.id;
    const ride = await Ride.findByPk(rideId, {
        include: [{ model: RideRequest, as: 'requests' }]
    });

    if (!ride) return res.status(404).send("Ride not found");
    if (ride.helper_id !== res.locals.user.id) return res.status(403).send("Unauthorized");
    if (ride.status === 'completed' || ride.status === 'cancelled') return res.redirect('/');

    if (ride.requests) {
        for (const request of ride.requests) {
            if (request.status === 'accepted') {
                await KarmaTransaction.update(
                    { status: 'completed' },
                    { where: { ride_id: ride.id, sender_id: request.seeker_id, status: 'escrow' } }
                );
                const helper = await User.findByPk(ride.helper_id);
                helper.karma_balance += ride.karma_reward;
                await helper.save();
                
                request.status = 'completed';
                await request.save();
                
                await Notification.create({
                    user_id: request.seeker_id,
                    type: 'ride_update',
                    content: `Your ride to ${ride.destination} is complete. Please rate your helper!`,
                    link: `/`
                });
            } else if (request.status === 'pending') {
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

    ride.status = 'completed';
    await ride.save();

    res.redirect('/');
});

app.post('/api/requests/:id/rate', requireAuth, async (req, res) => {
    const requestId = req.params.id;
    const { rating } = req.body;
    
    const request = await RideRequest.findByPk(requestId, {
        include: [{ model: Ride, as: 'ride' }]
    });

    if (!request) return res.status(404).send("Request not found");
    if (request.seeker_id !== res.locals.user.id) return res.status(403).send("Unauthorized");
    if (request.status !== 'completed') return res.status(400).send("Can only rate completed rides");
    
    request.rating = parseInt(rating);
    await request.save();

    const helperId = request.ride.helper_id;
    const allHelperRequests = await RideRequest.findAll({
        where: { rating: { [Op.not]: null } },
        include: [{
            model: Ride,
            as: 'ride',
            where: { helper_id: helperId }
        }]
    });

    const helper = await User.findByPk(helperId);
    if (allHelperRequests.length > 0) {
        const sum = allHelperRequests.reduce((acc, req) => acc + req.rating, 0);
        helper.trust_rating = parseFloat((sum / allHelperRequests.length).toFixed(1));
    }
    
    let badges = helper.badges || [];
    if (!badges.includes('First Journey') && allHelperRequests.length >= 1) {
        badges.push('First Journey');
    }
    if (!badges.includes('Stellar Rider') && request.rating === 5) {
        badges.push('Stellar Rider');
    }
    if (!badges.includes('Trusted Member') && allHelperRequests.length >= 5 && helper.trust_rating >= 4.5) {
        badges.push('Trusted Member');
    }
    helper.badges = badges;
    await helper.save();

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

    res.redirect(`/ride/${ride.id}/chat`);
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

    await Notification.create({
        user_id: request.seeker_id,
        type: 'ride_update',
        content: `Your ride request to ${request.ride.destination} was accepted!`,
        link: `/ride/${request.ride.id}/chat`
    });

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
            { model: RideRequest, as: 'requests', include: [{ model: User, as: 'seeker' }] },
            { model: Message, as: 'messages', include: [{ model: User, as: 'sender' }] }
        ]
    });

    if (!ride) return res.status(404).send("Ride not found");

    const isHelper = ride.helper_id === res.locals.user.id;
    const userReq = ride.requests ? ride.requests.find(r => r.seeker_id === res.locals.user.id && (r.status === 'pending' || r.status === 'accepted')) : null;

    if (!isHelper && !userReq) return res.status(403).send("Unauthorized");

    let otherPerson;
    if (isHelper) {
        const activeReq = ride.requests.find(r => r.status === 'accepted') || ride.requests.find(r => r.status === 'pending');
        otherPerson = activeReq ? activeReq.seeker : { name: 'Seekers', trust_rating: 5.0 };
    } else {
        otherPerson = ride.helper;
    }

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

    const ride = await Ride.findByPk(req.params.ride_id, {
        include: [{ model: RideRequest, as: 'requests' }]
    });
    let receiverId = null;
    if (res.locals.user.id === ride.helper_id) {
        const activeReq = ride.requests.find(r => r.status === 'accepted') || ride.requests.find(r => r.status === 'pending');
        if (activeReq) receiverId = activeReq.seeker_id;
    } else {
        receiverId = ride.helper_id;
    }

    if (receiverId) {
        await Notification.create({
            user_id: receiverId,
            type: 'message',
            content: `New message from ${res.locals.user.name}`,
            link: `/ride/${ride.id}/chat`
        });
    }

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
// --- PROFILE ROUTES ---
app.get('/profile', requireAuth, async (req, res) => {
    const error = req.query.error;
    const success = req.query.success;

    const recentOffered = await Ride.findAll({
        where: { helper_id: res.locals.user.id },
        order: [['date_time', 'DESC']],
        limit: 5
    });

    const recentRequests = await RideRequest.findAll({
        where: { seeker_id: res.locals.user.id },
        include: [{ model: Ride, as: 'ride' }],
        order: [['id', 'DESC']],
        limit: 5
    });
    const recentRequestedRides = recentRequests.map(r => r.ride).filter(r => r);

    res.render('profile.html', {
        recentOffered,
        recentRequestedRides,
        error,
        success: success ? "Profile updated successfully!" : null
    });
});

app.post('/profile', requireAuth, async (req, res) => {
    const { name, phone, email, current_password, new_password } = req.body;
    const user = await User.findByPk(res.locals.user.id);

    if (!user) return res.status(404).send("User not found");

    if (name) user.name = name;
    
    if (phone && phone !== user.phone) {
        const existing = await User.findOne({ where: { phone } });
        if (existing) {
            return res.redirect('/profile?error=' + encodeURIComponent('Phone number already in use'));
        }
        user.phone = phone;
    }

    if (email !== undefined) {
        const trimmedEmail = email.trim() !== '' ? email.trim() : null;
        if (trimmedEmail !== user.email) {
            if (trimmedEmail !== null) {
                const existing = await User.findOne({ where: { email: trimmedEmail } });
                if (existing && existing.id !== user.id) {
                    return res.redirect('/profile?error=' + encodeURIComponent('Email already in use'));
                }
            }
            user.email = trimmedEmail;
        }
    }

    if (new_password && new_password.trim() !== '') {
        if (!current_password) {
            return res.redirect('/profile?error=' + encodeURIComponent('Current password is required to set a new password'));
        }
        
        const isMatch = await bcrypt.compare(current_password, user.password_hash);
        if (!isMatch) {
            return res.redirect('/profile?error=' + encodeURIComponent('Incorrect current password'));
        }
        
        user.password_hash = await bcrypt.hash(new_password, 10);
    }

    await user.save();
    res.redirect('/profile?success=1');
});

// --- LEADERBOARD ROUTE ---
app.get('/leaderboard', requireAuth, async (req, res) => {
    const period = req.query.period || 'all';
    
    let users = await User.findAll();
    
    if (period === 'all') {
        users = users.map(u => {
            return { ...u.toJSON(), score: u.karma_balance };
        });
    } else {
        let startDate = new Date();
        if (period === 'today') {
            startDate.setHours(0, 0, 0, 0);
        } else if (period === 'week') {
            startDate.setDate(startDate.getDate() - startDate.getDay());
            startDate.setHours(0, 0, 0, 0);
        } else if (period === 'month') {
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
        }

        const txs = await KarmaTransaction.findAll({
            where: {
                timestamp: { [Op.gte]: startDate },
                status: { [Op.ne]: 'refunded' }
            }
        });

        const userScores = {};
        for (const tx of txs) {
            if (tx.receiver_id) {
                userScores[tx.receiver_id] = (userScores[tx.receiver_id] || 0) + tx.amount;
            }
        }

        users = users.map(u => {
            return { ...u.toJSON(), score: userScores[u.id] || 0 };
        });
    }

    users.sort((a, b) => b.score - a.score);

    const currentUserId = res.locals.user.id;
    let currentUserRank = -1;
    let currentUserData = null;

    for (let i = 0; i < users.length; i++) {
        if (users[i].id === currentUserId) {
            currentUserRank = i + 1;
            currentUserData = users[i];
            break;
        }
    }

    if (!currentUserData) {
        currentUserData = { ...res.locals.user.toJSON(), score: 0 };
        if (period === 'all') currentUserData.score = res.locals.user.karma_balance;
    }

    const topUsers = users.slice(0, 100);
    const podiumUsers = topUsers.slice(0, 3);
    const listUsers = topUsers.slice(3);

    res.render('leaderboard.html', {
        podium: podiumUsers,
        list_users: listUsers,
        current_rank: currentUserRank,
        current_user_data: currentUserData,
        period: period
    });
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

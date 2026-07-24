require('dotenv').config();
const express = require('express');
const nunjucks = require('nunjucks');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sequelize, User, Ride, RideRequest, KarmaTransaction, Message, Notification, RideAlert, Announcement, PushSubscription, RoadUpdate, SafetyReport, RideTemplate } = require('./models');
const multer = require('multer');
const fs = require('fs');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true, // true for port 465, false for port 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'static/uploads/road-updates/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

const app = express();

const webpush = require('web-push');

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:admin@karmaride.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.warn("⚠️ VAPID keys not found in .env. Web Push will not work.");
}

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

// Serve Service Worker from root
app.get('/sw.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'sw.js'));
});

// Setup Nunjucks
const env = nunjucks.configure('templates', {
    autoescape: true,
    express: app,
    noCache: true
});

env.addFilter('formatDate', function(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
});

app.set('view engine', 'html');

// --- LOCALIZATION ---
const enLocales = JSON.parse(fs.readFileSync('./locales/en.json', 'utf8'));
const hiLocales = JSON.parse(fs.readFileSync('./locales/hi.json', 'utf8'));

app.post('/api/set-language', (req, res) => {
    req.session.lang = req.body.lang || 'en';
    res.redirect(req.get('referer') || '/');
});

// Sync DB
sequelize.sync({ alter: true }).then(async () => {
    console.log("Database synced!");
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
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
    const user = await getCurrentUser(req);
    res.locals.user = user;
    if (user) {
        res.locals.templates = await RideTemplate.findAll({
            where: { user_id: user.id },
            order: [['timestamp', 'DESC']]
        });
    } else {
        res.locals.templates = [];
    }
    res.locals.vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    
    // Localization
    const lang = req.session.lang || 'en';
    res.locals.currentLang = lang;
    const locales = lang === 'hi' ? hiLocales : enLocales;
    res.locals.t = function(key) {
        return locales[key] || key; // Fallback to English key if not translated
    };
    
    // Check for mandatory email
    if (user && !user.email) {
        const allowedPaths = ['/add-email', '/logout'];
        // Let them access static files and the allowed paths
        if (!allowedPaths.includes(req.path) && !req.path.startsWith('/static')) {
            return res.redirect('/add-email');
        }
    }
    
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
    await Notification.destroy({ 
        where: { user_id: req.session.userId } 
    });
    res.sendStatus(200);
});

// --- AUTH ROUTES ---

app.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('login.html');
});

app.post('/login', async (req, res) => {
    const { phone, password } = req.body; // 'phone' is now acting as an identifier
    const user = await User.findOne({ 
        where: { 
            [Op.or]: [
                { phone: phone },
                { email: phone }
            ]
        } 
    });
    
    if (user && await bcrypt.compare(password, user.password_hash)) {
        req.session.userId = user.id;
        return res.redirect('/dashboard');
    }
    res.render('login.html', { error: 'Invalid phone or password' });
});

app.get('/register', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('register.html');
});

app.post('/register', async (req, res) => {
    const { name, phone, email, password } = req.body;
    
    // Check if exists
    const existing = await User.findOne({ where: { phone } });
    if (existing) {
        return res.render('register.html', { error: 'Phone number already registered' });
    }

    if (!email || email.trim() === '') {
        return res.render('register.html', { error: 'Email address is required' });
    }

    const existingEmail = await User.findOne({ where: { email: email.trim() } });
    if (existingEmail) {
        return res.render('register.html', { error: 'Email already registered' });
    }
    
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
        name,
        phone,
        email: email.trim(),
        password_hash,
        karma_balance: 50
    });
    
    req.session.userId = user.id;
    res.redirect('/dashboard');
});

app.get('/add-email', requireAuth, (req, res) => {
    // If they already have an email, they shouldn't be here
    if (res.locals.user && res.locals.user.email) {
        return res.redirect('/dashboard');
    }
    res.render('add_email.html');
});

app.post('/add-email', requireAuth, async (req, res) => {
    const { email } = req.body;
    
    if (!email || email.trim() === '') {
        return res.render('add_email.html', { error: 'Email address is required' });
    }

    const existingEmail = await User.findOne({ where: { email: email.trim() } });
    if (existingEmail) {
        return res.render('add_email.html', { error: 'Email is already in use by another account' });
    }
    
    await User.update({ email: email.trim() }, { where: { id: req.session.userId } });
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/forgot-password', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('forgot_password.html');
});

app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ where: { email: email.trim() } });
    if (!user) {
        return res.render('forgot_password.html', { error: 'No account found with this email' });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    req.session.resetOtp = otp;
    req.session.resetEmail = email.trim();

    try {
        await transporter.sendMail({
            from: `"KarmaRide" <${process.env.SMTP_USER}>`,
            to: email.trim(),
            subject: 'KarmaRide - Password Reset Code',
            text: `Your KarmaRide password reset code is: ${otp}. Please do not share this code with anyone.`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 30px; border-radius: 10px; border: 1px solid #eaeaea;">
                <h1 style="color: #4CAF50; text-align: center; margin-bottom: 10px;">KarmaRide</h1>
                <div style="text-align: center; margin-bottom: 15px;">
                    <img src="https://karmaride.in/static/scoo.gif" alt="KarmaRide Scooter" style="max-width: 150px; height: auto;">
                </div>
                <p style="text-align: center; color: #555; font-style: italic; margin-top: 0; margin-bottom: 30px;">"Share your journey, build your karma."</p>
                
                <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; text-align: center;">
                    <p style="font-size: 16px; color: #333;">Hello!</p>
                    <p style="font-size: 16px; color: #333;">You requested to reset your password. Use the verification code below to securely reset it:</p>
                    
                    <div style="margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4CAF50; padding: 10px 20px; background-color: #e8f5e9; border-radius: 8px; border: 1px dashed #4CAF50;">${otp}</span>
                    </div>
                    
                    <p style="font-size: 14px; color: #777;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
                </div>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
                    &copy; ${new Date().getFullYear()} KarmaRide. All rights reserved.
                </div>
            </div>
            `
        });
    } catch (err) {
        console.error('Error sending email:', err);
        return res.render('forgot_password.html', { error: 'Failed to send reset code. Check your .env configuration.' });
    }

    res.redirect('/reset-password');
});

app.get('/reset-password', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    if (!req.session.resetEmail) return res.redirect('/forgot-password');
    res.render('reset_password.html');
});

app.post('/reset-password', async (req, res) => {
    const { otp, new_password } = req.body;
    if (otp !== req.session.resetOtp) {
        return res.render('reset_password.html', { error: 'Invalid reset code' });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await User.update({ password_hash }, { where: { email: req.session.resetEmail } });

    req.session.resetOtp = null;
    req.session.resetEmail = null;

    res.render('login.html', { message: 'Password reset successful! Please log in.' }); 
});

// --- MAIN ROUTES (Protected) ---

app.get('/guidelines', async (req, res) => {
    res.render('guidelines.html');
});

app.get('/safety', async (req, res) => {
    res.render('safety.html');
});

app.get('/', async (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    const topHeroes = await User.findAll({
        order: [['karma_balance', 'DESC']],
        limit: 3
    });
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const roadUpdates = await RoadUpdate.findAll({
        where: { timestamp: { [Op.gt]: twentyFourHoursAgo } },
        include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
        order: [['timestamp', 'DESC']],
        limit: 5
    });
    res.render('landing.html', { topHeroes, roadUpdates });
});

app.get('/dashboard', requireAuth, async (req, res) => {
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

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const roadUpdates = await RoadUpdate.findAll({
        where: { timestamp: { [Op.gt]: twentyFourHoursAgo } },
        include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
        order: [['timestamp', 'DESC']],
        limit: 5
    });

    res.render('dashboard.html', {
        active_rides: active_rides,
        requests_made: requests_made,
        roadUpdates: roadUpdates
    });
});

app.get('/offer', requireAuth, (req, res) => {
    res.render('offer_ride.html');
});

app.post('/api/rides', requireAuth, async (req, res) => {
    const user = res.locals.user;
    const { source, destination, date_time_str, karma_reward, source_lat, source_lng, dest_lat, dest_lng } = req.body;
    
    await Ride.create({
        helper_id: user.id,
        source: source,
        destination: destination,
        date_time: new Date(date_time_str),
        route_waypoints: { source_lat, source_lng, dest_lat, dest_lng },
        karma_reward: parseInt(karma_reward)
    });
    
    res.redirect('/dashboard');
});

app.get('/request-ride', requireAuth, (req, res) => {
    res.render('request_ride.html');
});

app.post('/api/ride-alerts', requireAuth, async (req, res) => {
    const user = res.locals.user;
    const { source, destination, date_time_str, karma_reward, source_lat, source_lng, dest_lat, dest_lng } = req.body;
    
    const reward = parseInt(karma_reward);
    if (user.karma_balance < reward) {
        return res.status(400).send("Not enough Karma");
    }

    // Deduct Karma (Escrow)
    user.karma_balance -= reward;
    await user.save();

    const alert = await RideAlert.create({
        seeker_id: user.id,
        source: source,
        destination: destination,
        date_time: new Date(date_time_str),
        route_waypoints: { source_lat, source_lng, dest_lat, dest_lng },
        karma_reward: reward
    });

    // Notify all other users
    const otherUsers = await User.findAll({ where: { id: { [Op.ne]: user.id } } });
    for (const u of otherUsers) {
        await Notification.create({
            user_id: u.id,
            type: 'ride_alert',
            content: `${user.name} is looking for a ride from ${source} to ${destination}!`,
            link: '/find'
        });
    }

    res.redirect('/dashboard');
});

app.post('/api/ride-alerts/:id/fulfill', requireAuth, async (req, res) => {
    const user = res.locals.user;
    const alert = await RideAlert.findByPk(req.params.id, {
        include: [{ model: User, as: 'seeker' }]
    });

    if (!alert || alert.status !== 'open') return res.status(400).send("Alert not available");
    if (alert.seeker_id === user.id) return res.status(400).send("Cannot fulfill own alert");

    // Convert Alert to a Ride
    const newRide = await Ride.create({
        helper_id: user.id,
        source: alert.source,
        destination: alert.destination,
        date_time: alert.date_time,
        route_waypoints: alert.route_waypoints,
        karma_reward: alert.karma_reward,
        status: 'open'
    });

    // Automatically create accepted request for the seeker
    await RideRequest.create({
        ride_id: newRide.id,
        seeker_id: alert.seeker_id,
        status: 'accepted'
    });

    // Create KarmaTransaction for the escrow
    await KarmaTransaction.create({
        sender_id: alert.seeker_id,
        receiver_id: user.id,
        amount: alert.karma_reward,
        ride_id: newRide.id,
        status: 'escrow'
    });

    alert.status = 'fulfilled';
    await alert.save();

    // Notify the seeker
    await Notification.create({
        user_id: alert.seeker_id,
        type: 'ride_fulfilled',
        content: `${user.name} has accepted your ride request!`,
        link: `/ride/${newRide.id}/chat`
    });

    res.redirect(`/ride/${newRide.id}/chat`);
});

app.post('/api/rides/:ride_id/cancel', requireAuth, async (req, res) => {
    const ride = await Ride.findByPk(req.params.ride_id, {
        include: [{ model: RideRequest, as: 'requests' }]
    });

    if (!ride) return res.status(404).send("Ride not found");
    if (ride.helper_id !== res.locals.user.id) return res.status(403).send("Unauthorized");

    if (ride.status === 'cancelled') return res.redirect('/dashboard');

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

    res.redirect('/dashboard');
});

app.post('/api/rides/:id/complete', requireAuth, async (req, res) => {
    const rideId = req.params.id;
    const ride = await Ride.findByPk(rideId, {
        include: [{ model: RideRequest, as: 'requests' }]
    });

    if (!ride) return res.status(404).send("Ride not found");
    if (ride.helper_id !== res.locals.user.id) return res.status(403).send("Unauthorized");
    if (ride.status === 'completed' || ride.status === 'cancelled') return res.redirect('/dashboard');

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

    res.redirect('/dashboard');
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

    res.redirect('/dashboard');
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

    const active_alerts = await RideAlert.findAll({
        where: {
            status: 'open',
            seeker_id: { [Op.ne]: user.id }
        },
        include: [{ model: User, as: 'seeker' }]
    });

    res.render('find_ride.html', { rides: available_rides, alerts: active_alerts });
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

    res.redirect('/dashboard');
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


// --- RIDE TEMPLATES ---
app.post('/api/templates', requireAuth, async (req, res) => {
    try {
        const { name, source, destination } = req.body;
        await RideTemplate.create({
            user_id: req.session.userId,
            name: name,
            source: source,
            destination: destination
        });
        res.redirect('/profile');
    } catch (err) {
        console.error("Error creating template:", err);
        res.status(500).send("Error saving route template.");
    }
});

app.post('/api/templates/:id/delete', requireAuth, async (req, res) => {
    try {
        const template = await RideTemplate.findByPk(req.params.id);
        if (template && template.user_id === req.session.userId) {
            await template.destroy();
        }
        res.redirect('/profile');
    } catch (err) {
        console.error("Error deleting template:", err);
        res.status(500).send("Error deleting route template.");
    }
});

// --- ADMIN ROUTES ---
app.get('/secret-admin-panel', requireAdmin, async (req, res) => {
    const users = await User.findAll({ order: [['id', 'DESC']] });
    const rides = await Ride.findAll({ 
        include: [{ model: User, as: 'helper' }],
        order: [['id', 'DESC']] 
    });
    
    // Fetch recent ride alerts for "Recent Karma Alerts" section
    const rideAlerts = await RideAlert.findAll({
        include: [{ model: User, as: 'seeker' }],
        order: [['createdAt', 'DESC']],
        limit: 4
    });

    // Fetch recent karma transactions
    const recentTransactions = await KarmaTransaction.findAll({
        include: [
            { model: User, as: 'sender' },
            { model: User, as: 'receiver' }
        ],
        order: [['timestamp', 'DESC']],
        limit: 5
    });

    let totalKarma = 0;
    users.forEach(u => {
        totalKarma += (u.karma_balance || 0);
    });

    const activeRidesCount = rides.filter(r => r.status !== 'completed' && r.status !== 'cancelled').length;

    // Calculate activity trends for the past 7 days based on Rides created/scheduled
    const activityTrends = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dayStart = new Date(d.setHours(0,0,0,0));
        const dayEnd = new Date(d.setHours(23,59,59,999));
        
        // Count rides in this day
        const ridesCount = rides.filter(r => new Date(r.date_time) >= dayStart && new Date(r.date_time) <= dayEnd).length;
        
        activityTrends.push({
            dayName: days[d.getDay()],
            count: ridesCount,
            isToday: i === 0
        });
    }

    // Determine max count for scaling chart heights (min 1 to avoid division by zero)
    let maxActivity = Math.max(...activityTrends.map(t => t.count));
    if (maxActivity === 0) maxActivity = 1;

    // Calculate unique drivers
    const uniqueDrivers = new Set();
    rides.forEach(r => {
        if (r.helper_id) {
            uniqueDrivers.add(r.helper_id);
        }
    });

    res.render('admin.html', {
        all_users: users,
        all_rides: rides,
        ride_alerts: rideAlerts,
        activity_trends: activityTrends,
        max_activity: maxActivity,
        total_karma: totalKarma,
        active_rides_count: activeRidesCount,
        total_users: users.length,
        total_rides: rides.length,
        drivers_approved: uniqueDrivers.size,
        recent_transactions: recentTransactions
    });
});

app.post('/api/push/subscribe', requireAuth, async (req, res) => {
    const subscription = req.body;
    
    // Check if the subscription already exists to avoid duplicates
    const existing = await PushSubscription.findOne({ 
        where: { endpoint: subscription.endpoint } 
    });
    
    if (!existing) {
        await PushSubscription.create({
            user_id: req.session.userId,
            endpoint: subscription.endpoint,
            keys: subscription.keys
        });
    } else if (existing.user_id !== req.session.userId) {
        // Update user_id if the same device is used by a new user
        existing.user_id = req.session.userId;
        await existing.save();
    }
    
    res.status(201).json({ success: true });
});

app.get('/report-road', requireAuth, (req, res) => {
    res.render('report_road.html');
});

app.get('/report-issue', requireAuth, (req, res) => {
    res.render('report_issue.html');
});

app.post('/report-issue', requireAuth, async (req, res) => {
    try {
        const { issue_type, description, reported_user_id } = req.body;
        
        await SafetyReport.create({
            reporter_id: req.session.userId,
            issue_type,
            description,
            reported_user_id: reported_user_id ? parseInt(reported_user_id, 10) : null
        });

        res.redirect('/dashboard?success=Report+submitted+successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error submitting report");
    }
});

app.post('/api/road-updates', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { location, description, issue_type } = req.body;
        const image_url = req.file ? `/static/uploads/road-updates/${req.file.filename}` : null;
        
        await RoadUpdate.create({
            user_id: req.session.userId,
            issue_type: issue_type || 'Other',
            location: location,
            description: description,
            image_url: image_url
        });
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error("Error creating road update:", error);
        res.status(500).send("Error submitting road update.");
    }
});

app.post('/api/road-updates/:id/upvote', async (req, res) => {
    try {
        const id = req.params.id;
        req.session.votedUpdates = req.session.votedUpdates || {};
        if (req.session.votedUpdates[id]) {
            return res.status(400).json({ error: "You have already voted on this update in this session." });
        }

        const update = await RoadUpdate.findByPk(id);
        if (!update) return res.status(404).json({ error: "Update not found" });
        update.upvotes += 1;
        await update.save();
        
        req.session.votedUpdates[id] = 'upvote';
        res.json({ success: true, upvotes: update.upvotes });
    } catch (error) {
        console.error("Error upvoting road update:", error);
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/road-updates/:id/downvote', async (req, res) => {
    try {
        const id = req.params.id;
        req.session.votedUpdates = req.session.votedUpdates || {};
        if (req.session.votedUpdates[id]) {
            return res.status(400).json({ error: "You have already voted on this update in this session." });
        }

        const update = await RoadUpdate.findByPk(id);
        if (!update) return res.status(404).json({ error: "Update not found" });
        update.downvotes += 1;
        await update.save();
        
        req.session.votedUpdates[id] = 'downvote';
        res.json({ success: true, downvotes: update.downvotes });
    } catch (error) {
        console.error("Error downvoting road update:", error);
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/road-updates/:id/delete', requireAuth, async (req, res) => {
    try {
        const update = await RoadUpdate.findByPk(req.params.id);
        if (!update) return res.status(404).json({ error: "Update not found" });
        
        // Only the creator or admin can delete
        const user = await User.findByPk(req.session.userId);
        if (update.user_id !== req.session.userId && user.role !== 'admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }
        
        await update.destroy();
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting road update:", error);
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/admin/trends', requireAdmin, async (req, res) => {
    const daysParam = parseInt(req.query.days) || 7;
    const rides = await Ride.findAll();
    const activityTrends = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    
    for (let i = daysParam - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dayStart = new Date(d.setHours(0,0,0,0));
        const dayEnd = new Date(d.setHours(23,59,59,999));
        
        const ridesCount = rides.filter(r => new Date(r.date_time) >= dayStart && new Date(r.date_time) <= dayEnd).length;
        
        // For 30 days, we might want to group by day, but returning 30 bars is fine for now
        // Let's format the date label differently for 30 days so it fits (e.g. '12/5' instead of 'Mon')
        let label = days[d.getDay()];
        if (daysParam > 7) {
            label = `${d.getDate()}/${d.getMonth()+1}`;
        }
        
        activityTrends.push({
            dayName: label,
            count: ridesCount,
            isToday: i === 0
        });
    }

    let maxActivity = Math.max(...activityTrends.map(t => t.count));
    if (maxActivity === 0) maxActivity = 1;

    res.json({
        trends: activityTrends,
        max_activity: maxActivity
    });
});

app.get('/secret-admin-panel/announcements/new', requireAdmin, async (req, res) => {
    res.render('admin_announcement_new.html', { success: req.query.success });
});

app.post('/secret-admin-panel/announcements', requireAdmin, async (req, res) => {
    const { title, audience, body, push_notification } = req.body;
    
    const announcement = await Announcement.create({
        title,
        audience,
        body,
        push_notification: push_notification === 'true'
    });

    // Determine target users based on audience
    let targetUsers = [];
    if (audience === 'drivers') {
        const uniqueDrivers = new Set((await Ride.findAll()).map(r => r.helper_id));
        targetUsers = await User.findAll({ where: { id: Array.from(uniqueDrivers) } });
    } else if (audience === 'riders') {
        const uniqueRiders = new Set((await RideRequest.findAll()).map(r => r.seeker_id));
        targetUsers = await User.findAll({ where: { id: Array.from(uniqueRiders) } });
    } else {
        targetUsers = await User.findAll();
    }

    // Create in-app notifications for targeted users
    const notifications = targetUsers.map(user => ({
        user_id: user.id,
        type: 'announcement',
        content: title,
        link: '#' // Link to the announcement details
    }));

    if (notifications.length > 0) {
        await Notification.bulkCreate(notifications);
    }

    if (push_notification === 'true' && process.env.VAPID_PUBLIC_KEY) {
        const targetUserIds = targetUsers.map(u => u.id);
        const subscriptions = await PushSubscription.findAll({
            where: { user_id: { [Op.in]: targetUserIds } }
        });

        const payload = JSON.stringify({
            title: 'New Announcement: ' + title,
            body: body.substring(0, 100) + (body.length > 100 ? '...' : ''),
            url: '/'
        });

        const pushPromises = subscriptions.map(sub => {
            const pushSub = {
                endpoint: sub.endpoint,
                keys: sub.keys
            };
            return webpush.sendNotification(pushSub, payload).catch(err => {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    console.log('Subscription has expired or is no longer valid: ', err);
                    return sub.destroy();
                } else {
                    console.error('Error sending push notification: ', err);
                }
            });
        });

        await Promise.all(pushPromises);
    }

    res.redirect('/secret-admin-panel/announcements/new?success=true');
});

app.get('/secret-admin-panel/members', requireAdmin, async (req, res) => {
    const users = await User.findAll({ order: [['id', 'DESC']] });
    
    // Total Karma
    let totalKarma = 0;
    let totalTrust = 0;
    users.forEach(u => {
        totalKarma += (u.karma_balance || 0);
        totalTrust += (u.trust_rating || 5.0);
    });
    const avgTrust = users.length > 0 ? (totalTrust / users.length).toFixed(1) : "5.0";

    // Active Drivers
    const rides = await Ride.findAll();
    const uniqueDrivers = new Set();
    rides.forEach(r => {
        if (r.helper_id) {
            uniqueDrivers.add(r.helper_id);
        }
    });

    res.render('admin_members.html', { 
        all_users: users,
        total_karma: totalKarma,
        drivers_approved: uniqueDrivers.size,
        avg_trust: avgTrust
    });
});



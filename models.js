require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

if (!process.env.DATABASE_URL) {
    console.error("❌ CRITICAL ERROR: DATABASE_URL is missing!");
    console.error("If running locally: Copy .env.example to .env and add your Supabase URL.");
    console.error("If on Hostinger: Add DATABASE_URL to your Environment Variables.");
    process.exit(1);
}

// Initialize Sequelize for PostgreSQL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false // Required by Supabase
        }
    },
    logging: false
});

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, unique: true, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    karma_balance: { type: DataTypes.INTEGER, defaultValue: 50 },
    trust_rating: { type: DataTypes.FLOAT, defaultValue: 5.0 },
    badges: { type: DataTypes.JSON, defaultValue: [] }
}, { tableName: 'users', timestamps: false });

const Ride = sequelize.define('Ride', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    helper_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id' } },
    source: { type: DataTypes.STRING, allowNull: false },
    destination: { type: DataTypes.STRING, allowNull: false },
    date_time: { type: DataTypes.DATE, allowNull: false },
    route_waypoints: { type: DataTypes.JSON },
    karma_reward: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'open' }
}, { tableName: 'rides', timestamps: false });

const RideRequest = sequelize.define('RideRequest', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ride_id: { type: DataTypes.INTEGER, references: { model: Ride, key: 'id' } },
    seeker_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id' } },
    status: { type: DataTypes.STRING, defaultValue: 'pending' },
    rating: { type: DataTypes.INTEGER, allowNull: true }
}, { tableName: 'ride_requests', timestamps: false });

const Message = sequelize.define('Message', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ride_id: { type: DataTypes.INTEGER, references: { model: Ride, key: 'id' } },
    sender_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id' } },
    content: { type: DataTypes.TEXT, allowNull: false },
    sent_at: { type: DataTypes.DATE, defaultValue: Sequelize.NOW }
}, { tableName: 'messages', timestamps: false });

const KarmaTransaction = sequelize.define('KarmaTransaction', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sender_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: User, key: 'id' } },
    receiver_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id' } },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    ride_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: Ride, key: 'id' } },
    status: { type: DataTypes.STRING, defaultValue: 'escrow' },
    timestamp: { type: DataTypes.DATE, defaultValue: Sequelize.NOW }
}, { tableName: 'karma_transactions', timestamps: false });

const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id' } },
    type: { type: DataTypes.STRING, allowNull: false },
    content: { type: DataTypes.STRING, allowNull: false },
    link: { type: DataTypes.STRING, allowNull: true },
    is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
    timestamp: { type: DataTypes.DATE, defaultValue: Sequelize.NOW }
}, { tableName: 'notifications', timestamps: false });

const RideAlert = sequelize.define('RideAlert', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    seeker_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id' } },
    source: { type: DataTypes.STRING, allowNull: false },
    destination: { type: DataTypes.STRING, allowNull: false },
    date_time: { type: DataTypes.DATE, allowNull: false },
    route_waypoints: { type: DataTypes.JSON },
    karma_reward: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'open' } // open, fulfilled, cancelled
}, { tableName: 'ride_alerts', timestamps: true });

const Announcement = sequelize.define('Announcement', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    audience: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    push_notification: { type: DataTypes.BOOLEAN, defaultValue: false },
    timestamp: { type: DataTypes.DATE, defaultValue: Sequelize.NOW }
}, { tableName: 'announcements', timestamps: false });

// Relationships
User.hasMany(Ride, { foreignKey: 'helper_id', as: 'rides_offered' });
Ride.belongsTo(User, { foreignKey: 'helper_id', as: 'helper' });

User.hasMany(RideRequest, { foreignKey: 'seeker_id', as: 'rides_requested' });
RideRequest.belongsTo(User, { foreignKey: 'seeker_id', as: 'seeker' });

Ride.hasMany(RideRequest, { foreignKey: 'ride_id', as: 'requests' });
RideRequest.belongsTo(Ride, { foreignKey: 'ride_id', as: 'ride' });

Ride.hasMany(Message, { foreignKey: 'ride_id', as: 'messages' });
Message.belongsTo(Ride, { foreignKey: 'ride_id', as: 'ride' });

User.hasMany(Message, { foreignKey: 'sender_id', as: 'messages_sent' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

KarmaTransaction.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
KarmaTransaction.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

User.hasMany(RideAlert, { foreignKey: 'seeker_id', as: 'ride_alerts' });
RideAlert.belongsTo(User, { foreignKey: 'seeker_id', as: 'seeker' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = { sequelize, User, Ride, RideRequest, KarmaTransaction, Message, Notification, RideAlert, Announcement };

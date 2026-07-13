const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'karmaride.sqlite'),
    logging: false
});

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, unique: true, allowNull: false },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    karma_balance: { type: DataTypes.INTEGER, defaultValue: 50 },
    trust_rating: { type: DataTypes.FLOAT, defaultValue: 5.0 }
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
    status: { type: DataTypes.STRING, defaultValue: 'pending' }
}, { tableName: 'ride_requests', timestamps: false });

const KarmaTransaction = sequelize.define('KarmaTransaction', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sender_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: User, key: 'id' } },
    receiver_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id' } },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    ride_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: Ride, key: 'id' } },
    status: { type: DataTypes.STRING, defaultValue: 'escrow' },
    timestamp: { type: DataTypes.DATE, defaultValue: Sequelize.NOW }
}, { tableName: 'karma_transactions', timestamps: false });

// Relationships
User.hasMany(Ride, { foreignKey: 'helper_id', as: 'rides_offered' });
Ride.belongsTo(User, { foreignKey: 'helper_id', as: 'helper' });

User.hasMany(RideRequest, { foreignKey: 'seeker_id', as: 'rides_requested' });
RideRequest.belongsTo(User, { foreignKey: 'seeker_id', as: 'seeker' });

Ride.hasMany(RideRequest, { foreignKey: 'ride_id', as: 'requests' });
RideRequest.belongsTo(Ride, { foreignKey: 'ride_id', as: 'ride' });

module.exports = { sequelize, User, Ride, RideRequest, KarmaTransaction };

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const DB_TYPE = process.env.DB_TYPE || 'sqlite';

let sequelize;

if (DB_TYPE === 'postgres') {
    sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASS,
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            dialect: 'postgres',
            logging: false, // Set to console.log to see SQL queries
        }
    );
} else {
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: process.env.NODE_ENV === 'test' ? ':memory:' : path.resolve(__dirname, 'learning_tracker.db'),
        logging: false,
    });
}

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: DataTypes.STRING,
        unique: true,
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
    },
    password_hash: {
        type: DataTypes.STRING,
    },
    phone_number: {
        type: DataTypes.STRING,
    },
    is_verified: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    verification_token: {
        type: DataTypes.STRING,
    },
    reset_token: {
        type: DataTypes.STRING,
    },
    reset_token_expiry: {
        type: DataTypes.BIGINT, // Using BIGINT for timestamps
    },
}, {
    tableName: 'users',
    timestamps: false, // We are not managing createdAt/updatedAt for users in this schema
});

const Learning = sequelize.define('Learning', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    created_at: {
        type: DataTypes.TEXT, // Keeping as TEXT to match existing schema/logic
        allowNull: false,
    },
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id',
        },
    },
}, {
    tableName: 'learnings',
    timestamps: false,
});

// Associations
User.hasMany(Learning, { foreignKey: 'user_id' });
Learning.belongsTo(User, { foreignKey: 'user_id' });

const initDb = async () => {
    try {
        await sequelize.authenticate();
        console.log(`Connected to ${DB_TYPE} database via Sequelize.`);

        // Sync models with database
        // alter: true will update tables if they exist, but be careful in production
        await sequelize.sync({ alter: true });
        console.log('Database synced.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

initDb();

module.exports = { sequelize, User, Learning };

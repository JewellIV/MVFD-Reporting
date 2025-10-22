const sequelize = require('./config/database');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully');

    // Sync all models
    await sequelize.sync({ force: true });
    console.log('Database synchronized');

    // Create admin user
    const adminUser = await User.create({
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@mangohick-vfd.org',
      password: 'admin123',
      role: 'admin',
      isActive: true,
      department: 'Mangohick Volunteer Fire Department',
      badgeNumber: 'ADMIN001',
      phone: '555-0001'
    });

    console.log('Admin user created successfully!');
    console.log('Username: admin');
    console.log('Email: admin@mangohick-vfd.org');
    console.log('Password: admin123');
    console.log('Please change the password after first login.');

  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await sequelize.close();
  }
}

setupDatabase();

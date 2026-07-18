import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

const MONGODB_URI = process.env.MONGODB_URI as string;

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    password: String,
    role: String,
  },
  { timestamps: true },
);

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);

    const existingAdmin = await User.findOne({
      email: 'admin@japanpattasu.com',
    });

    if (existingAdmin) {
      console.log('Admin already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    await User.create({
      name: 'Japan Pattasu Admin',
      email: 'admin@japanpattasu.com',
      password: hashedPassword,
      role: 'admin',
    });

    console.log('Admin created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Admin creation failed', error);
    process.exit(1);
  }
}

createAdmin();
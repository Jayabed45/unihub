import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Role from '../models/Role'; // Explicitly import Role

export const login = async (req: Request, res: Response) => {
  console.log('Login attempt received for email:', req.body.email);
  const { email, password } = req.body;

  try {
        console.log('Step 1: Finding user...');
    const user = await User.findOne({ email }).populate({
      path: 'role',
      model: Role,
      select: 'name',
    });

        console.log('Step 2: User found:', !!user);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

        console.log('Step 3: Comparing passwords...');
    const isMatch = await bcrypt.compare(password, user.passwordHash);

        console.log('Step 4: Passwords match:', isMatch);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

            console.log('Step 5: Checking user role...');
    if (!user.role || !(user.role as any).name) {
      return res.status(500).json({ message: 'User role is not defined' });
    }

        console.log('Step 6: Creating JWT payload...');
    const payload = {
      user: {
        id: user.id,
        role: (user.role as any).name, // This should be 'Administrator'
      },
    };

        console.log('Step 7: Signing JWT...');
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: payload.user });
      }
    );
  } catch (err: any) {
        console.error('CRITICAL ERROR in login controller:', err);
    res.status(500).send('Server error');
  }
};

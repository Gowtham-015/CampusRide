const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const dotenv    = require('dotenv');
const connectDB = require('./config/db');
const http      = require('http');
const socketIo  = require('socket.io');

dotenv.config();
connectDB();

const app    = express();
const server = http.createServer(app);

app.use(cors({ origin: true, credentials: true, methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, res, next) => { console.log(`${req.method} ${req.originalUrl}`); next(); });

const io = socketIo(server, { cors: { origin: '*', methods: ['GET','POST'] }, transports: ['websocket','polling'] });
app.set('io', io);
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('join-ride', (rideId) => socket.join(`ride-${rideId}`));
  socket.on('send-message', async (data) => {
    try {
      const Chat = require('./chat/chat.model');
      const { rideId, senderId, message } = data;
      const chat = new Chat({ rideId, sender: senderId, message });
      await chat.save();
      io.to(`ride-${rideId}`).emit('receive-message', { rideId, senderId, message, createdAt: chat.createdAt });
    } catch (err) { console.error('Chat error:', err.message); }
  });
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

const User    = require('./users/users.model');
const Ride    = require('./rides/rides.model');
const Booking = require('./bookings/bookings.model');
const auth    = require('./middleware/auth');

const COLLEGE_SUFFIXES = ['.ac.in', '.edu.in', '.edu', '.ac.uk', '.ac.nz', '.ac.za', '.ac.lk', '.ac.jp'];
const COLLEGE_EXACT    = ['christuniversity.in', 'jain.ac.in', 'reva.edu.in'];

const isCollegeEmail = (email) => {
  if (!email || !email.includes('@')) return false;
  const domain    = '@' + email.split('@')[1].toLowerCase();
  const rawDomain = email.split('@')[1].toLowerCase();
  if (COLLEGE_SUFFIXES.some(s => domain.endsWith(s))) return true;
  if (COLLEGE_EXACT.includes(rawDomain)) return true;
  return false;
};

// ── Send OTP via Fast2SMS ─────────────────────────────────────────
const sendOtpSms = async (phone, otp) => {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    console.log(`[OTP - SMS NOT CONFIGURED] ${phone} => ${otp}`);
    return { sent: false, reason: 'no_config' };
  }

  const digits  = phone.replace(/[^0-9]/g, '').replace(/^91/, '').slice(-10);
  const message = `Your CampusRide OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`;
  const url     = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=q&message=${encodeURIComponent(message)}&flash=0&numbers=${digits}`;

  const response = await fetch(url);
  const data     = await response.json();
  console.log('[Fast2SMS Response]', JSON.stringify(data));

  if (data.return === true) {
    console.log(`[OTP] SMS sent to ${digits}`);
    return { sent: true };
  }

  throw new Error(data.message?.[0] || 'SMS sending failed');
};

app.get('/',       (req, res) => res.json({ message: 'CampusRide API is running!', timestamp: new Date().toISOString() }));
app.get('/health', (req, res) => res.json({ status: 'OK', database: mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...' }));

app.post('/auth/register', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const jwt    = require('jsonwebtoken');
    const { name, email, password, phone, role, college } = req.body;

    if (!name || !email || !password || !phone || !role)
      return res.status(400).json({ message: 'All fields are required' });

    if (role !== 'admin' && !isCollegeEmail(email)) {
      return res.status(400).json({
        message: 'Please use your college/university email address (e.g. name@college.ac.in)',
        hint: 'Only .ac.in, .edu.in, .edu domains are accepted'
      });
    }

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists with this email' });

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({
      name, email, password: hashedPassword, phone, role,
      college: role === 'admin' ? 'Admin' : college
    });
    await user.save();

    const token = jwt.sign({ userId: user._id }, 'mySuperSecretKey123', { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: {
        id: user._id, name: user.name, email: user.email,
        role: user.role, college: user.college, phone: user.phone,
        verified: user.verified, kycData: user.kycData
      }
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const jwt    = require('jsonwebtoken');
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, 'mySuperSecretKey123', { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id, name: user.name, email: user.email,
        role: user.role, college: user.college, phone: user.phone,
        verified: user.verified, kycData: user.kycData
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

app.get('/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const userData = user.toObject();
    userData.id = userData._id;
    res.json(userData);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/auth/send-otp', async (req, res) => {
  try {
    const { email, phone } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });

    if (!isCollegeEmail(email)) {
      return res.status(400).json({
        message: 'Only college/university email addresses are accepted',
        hint: 'Use your .ac.in, .edu.in or .edu email'
      });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^91/, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ message: 'Enter a valid 10-digit phone number' });
    }

    const otp    = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    global.otpStore = global.otpStore || {};
    global.otpStore[email] = { otp, expiry, phone: cleanPhone };

    console.log(`[OTP] ${email} | ${cleanPhone} => ${otp}`);

    let smsSent = false;
    try {
      const result = await sendOtpSms(cleanPhone, otp);
      smsSent = result.sent;
    } catch (smsErr) {
      console.error('SMS send error:', smsErr.message);
    }

    if (smsSent) {
      res.json({
        message: `OTP sent to your phone number ending in ${cleanPhone.slice(-4)}`,
        smsSent: true
      });
    } else {
      res.json({
        message: 'OTP generated successfully.',
        smsSent: false,
        otp: otp
      });
    }
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    global.otpStore = global.otpStore || {};
    const stored = global.otpStore[email];
    if (!stored)           return res.status(400).json({ message: 'No OTP found for this email. Request a new one.' });
    if (new Date() > stored.expiry) {
      delete global.otpStore[email];
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }
    if (stored.otp !== String(otp)) return res.status(400).json({ message: 'Invalid OTP. Please check and try again.' });
    delete global.otpStore[email];
    res.json({ message: 'OTP verified successfully', verified: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/users/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/users/profile', auth, async (req, res) => {
  try {
    const updates = req.body; delete updates.password;
    const user = await User.findByIdAndUpdate(req.user.userId, updates, { new: true }).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/users/all', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.userId);
    if (me.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/dev/fix-role', async (req, res) => {
  try {
    const { email, role } = req.body;
    const user = await User.findOneAndUpdate({ email }, { role }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: `Role updated to ${role}`, email: user.email, role: user.role });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.use('/ride',      require('./rides/rides.routes'));
app.use('/booking',   require('./bookings/bookings.routes'));
app.use('/ratings',   require('./ratings/ratings.routes'));
app.use('/kyc',       require('./kyc/kyc.routes'));
app.use('/tracking',  require('./tracking/tracking.routes'));
app.use('/chat',      require('./chat/chat.routes'));
app.use('/admin',     require('./admin/admin.routes'));
app.use('/alerts',    require('./alerts/alerts.routes'));
app.use('/sos',       require('./sos/sos.routes'));
app.use('/incidents', require('./incidents/incidents.routes'));

app.use((req, res) => res.status(404).json({ error: 'Route not found', url: req.originalUrl }));
app.use((err, req, res, next) => { console.error('Server error:', err.message); res.status(500).json({ error: err.message }); });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
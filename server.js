require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const { dbConnect } = require('./utiles/db');
const http = require('http');
const { Server } = require('socket.io');

if (!process.env.SECRET) {
    throw new Error('SECRET (JWT secret) is required');
}

const app = express();
const server = http.createServer(app); // single server instance

// Render/Vercel/etc. put us behind a proxy; needed for rate-limit and
// secure-cookie handling to see the real client IP and protocol.
app.set('trust proxy', 1);

const corsOptions = {
    origin: ['https://www.nimbo.co.zw', 'https://nimbo-dashboard.vercel.app'],
    credentials: true
};


app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(cookieParser());

// Socket.IO setup
const io = new Server(server, {
    cors: corsOptions
});

// Authenticate socket handshake from cookies. We attach identity to `soc.user`
// (null if the client has no valid cookie) and enforce role/identity on
// privileged events below. Without this, any client could emit add_admin
// and be treated as admin.
io.use((soc, next) => {
    try {
        const rawCookie = soc.handshake.headers.cookie;
        if (!rawCookie) {
            soc.user = null;
            return next();
        }
        const cookies = cookie.parse(rawCookie);
        const token = cookies.accessToken || cookies.customerToken;
        if (!token) {
            soc.user = null;
            return next();
        }
        const decoded = jwt.verify(token, process.env.SECRET);
        soc.user = {
            id: decoded.id,
            role: decoded.role || (cookies.customerToken ? 'customer' : null)
        };
    } catch (err) {
        soc.user = null;
    }
    next();
});

let allCustomer = [];
let allSeller = [];
let admin = {};

// User helpers
const addUser = (customerId, socketId, userInfo) => {
    const existingIndex = allCustomer.findIndex(u => u.customerId === customerId);
    if (existingIndex !== -1) {
        // Update socket ID if user reconnects
        allCustomer[existingIndex].socketId = socketId;
        allCustomer[existingIndex].userInfo = userInfo;
    } else {
        allCustomer.push({ customerId, socketId, userInfo });
    }
};

const addSeller = (sellerId, socketId, userInfo) => {
    const existingIndex = allSeller.findIndex(s => s.sellerId === sellerId);
    if (existingIndex !== -1) {
        // Update socket ID if seller reconnects
        allSeller[existingIndex].socketId = socketId;
        allSeller[existingIndex].userInfo = userInfo;
    } else {
        allSeller.push({ sellerId, socketId, userInfo });
    }
};

const findCustomer = (customerId) => allCustomer.find(c => c.customerId === customerId);
const findSeller = (sellerId) => allSeller.find(s => s.sellerId === sellerId);

const remove = (socketId) => {
    allCustomer = allCustomer.filter(c => c.socketId !== socketId);
    allSeller = allSeller.filter(s => s.socketId !== socketId);
    if (admin.socketId === socketId) {
        admin = {};
    }
};

// Socket events
io.on('connection', (soc) => {
    console.log('🔌 Socket connected:', soc.id);

    soc.on('add_user', (customerId, userInfo) => {
        if (!soc.user || soc.user.role !== 'customer' || String(soc.user.id) !== String(customerId)) {
            return;
        }
        addUser(customerId, soc.id, userInfo);
        io.emit('activeSeller', allSeller);
        io.emit('activeCustomer', allCustomer);
        console.log(`👤 Customer added: ${customerId}, Total customers: ${allCustomer.length}`);
    });

    soc.on('add_seller', (sellerId, userInfo) => {
        if (!soc.user || soc.user.role !== 'seller' || String(soc.user.id) !== String(sellerId)) {
            return;
        }
        addSeller(sellerId, soc.id, userInfo);
        io.emit('activeSeller', allSeller);
        io.emit('activeCustomer', allCustomer);
        console.log(`🛍️ Seller added: ${sellerId}, Total sellers: ${allSeller.length}`);
    });

    soc.on('send_seller_message', (msg) => {
        if (!soc.user || soc.user.role !== 'seller') return;
        const customerId = msg.receiverId || msg.receverId;
        const customer = findCustomer(customerId);
        if (customer) {
            io.to(customer.socketId).emit('seller_message', msg);
        }
    });

    soc.on('send_customer_message', (msg) => {
        if (!soc.user || soc.user.role !== 'customer') return;
        const sellerId = msg.receiverId || msg.receverId;
        const seller = findSeller(sellerId);
        if (seller) {
            io.to(seller.socketId).emit('customer_message', msg);
        }
    });

    soc.on('send_message_admin_to_seller', (msg) => {
        if (!soc.user || soc.user.role !== 'admin') return;
        const seller = findSeller(msg.receiverId);
        if (seller) {
            io.to(seller.socketId).emit('received_admin_message', msg);
        }
    });

    // Delivery details update - notify customer when seller updates delivery info
    soc.on('delivery_details_updated', (data) => {
        if (!soc.user || soc.user.role !== 'seller') return;
        const { customerId, orderId, deliveryDetails } = data;
        const customer = findCustomer(customerId);
        if (customer) {
            io.to(customer.socketId).emit('order_delivery_updated', { orderId, deliveryDetails });
        }
    });

    soc.on('send_message_seller_to_admin', (msg) => {
        if (!soc.user || soc.user.role !== 'seller') return;
        if (admin.socketId) {
            io.to(admin.socketId).emit('received_seller_message', msg);
        }
    });

    soc.on('add_admin', (adminInfo) => {
        if (!soc.user || soc.user.role !== 'admin') {
            return;
        }
        admin = {
            ...adminInfo,
            socketId: soc.id
        };
        delete admin.email;
        delete admin.password;
        io.emit('activeSeller', allSeller);
        io.emit('activeCustomer', allCustomer);
        console.log('🛡️ Admin connected');
    });

    soc.on('disconnect', () => {
        console.log('❌ Socket disconnected:', soc.id);
        remove(soc.id);
        io.emit('activeSeller', allSeller);
        io.emit('activeCustomer', allCustomer);
    });
});

// Routes
app.use('/api/home', require('./routes/home/homeRoutes'));
app.use('/api/home', require('./routes/home/blogRoutes'));
app.use('/api', require('./routes/authRoutes'));
app.use('/api', require('./routes/order/orderRoutes'));
app.use('/api', require('./routes/home/cardRoutes'));
app.use('/api', require('./routes/dashboard/categoryRoutes'));
app.use('/api', require('./routes/dashboard/productRoutes'));
app.use('/api', require('./routes/dashboard/sellerRoutes'));
app.use('/api', require('./routes/home/customerAuthRoutes'));
app.use('/api', require('./routes/chatRoutes'));
app.use('/api', require('./routes/paymentRoutes'));
app.use('/api', require('./routes/dashboard/dashboardRoutes'));

app.get('/', (req, res) => res.send('Hello Server'));

// DB & Server start
const PORT = process.env.PORT || 5000;
dbConnect();
server.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));

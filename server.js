require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { dbConnect } = require('./utiles/db');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app); // single server instance
const isProduction = process.env.MODE === 'pro';

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

let allCustomer = [];
let allSeller = [];
let admin = {};

// User helpers
const addUser = (customerId, socketId, userInfo) => {
    const exists = allCustomer.some(u => u.customerId === customerId);
    if (!exists) {
        allCustomer.push({ customerId, socketId, userInfo });
    }
};

const addSeller = (sellerId, socketId, userInfo) => {
    const exists = allSeller.some(s => s.sellerId === sellerId);
    if (!exists) {
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
        addUser(customerId, soc.id, userInfo);
        io.emit('activeSeller', allSeller);
        console.log(`👤 Customer added: ${customerId}`);
    });

    soc.on('add_seller', (sellerId, userInfo) => {
        addSeller(sellerId, soc.id, userInfo);
        io.emit('activeSeller', allSeller);
        console.log(`🛍️ Seller added: ${sellerId}`);
    });

    soc.on('send_seller_message', (msg) => {
        const customer = findCustomer(msg.receiverId);
        if (customer) {
            io.to(customer.socketId).emit('seller_message', msg);
        }
    });

    soc.on('send_customer_message', (msg) => {
        const seller = findSeller(msg.receiverId);
        if (seller) {
            io.to(seller.socketId).emit('customer_message', msg);
        }
    });

    soc.on('send_message_admin_to_seller', (msg) => {
        const seller = findSeller(msg.receiverId);
        if (seller) {
            io.to(seller.socketId).emit('received_admin_message', msg);
        }
    });

    soc.on('send_message_seller_to_admin', (msg) => {
        if (admin.socketId) {
            io.to(admin.socketId).emit('received_seller_message', msg);
        }
    });

    soc.on('add_admin', (adminInfo) => {
        admin = {
            ...adminInfo,
            socketId: soc.id
        };
        delete admin.email;
        delete admin.password;
        io.emit('activeSeller', allSeller);
        console.log('🛡️ Admin connected');
    });

    soc.on('disconnect', () => {
        console.log('❌ Socket disconnected:', soc.id);
        remove(soc.id);
        io.emit('activeSeller', allSeller);
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

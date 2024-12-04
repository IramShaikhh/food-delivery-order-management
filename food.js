const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');

const app = express();
const PORT = 5000;

// Middleware
app.use(bodyParser.json());

// In-memory storage
const menu = [];
const orders = [];
const statuses = ['Preparing', 'Out for Delivery', 'Delivered'];

// Helper functions
function validateMenuItem(item) {
    if (!item.name || typeof item.name !== 'string') return 'Name is required and must be a string.';
    if (!item.price || typeof item.price !== 'number' || item.price <= 0) return 'Price must be a positive number.';
    if (!item.category || !['Starter', 'Main Course', 'Dessert', 'Beverage'].includes(item.category)) {
        return 'Category must be one of Starter, Main Course, Dessert, or Beverage.';
    }
    return null;
}

function findOrderById(id) {
    return orders.find(order => order.id === id);
}

// Endpoints

// Add or update menu items
app.post('/menu', (req, res) => {
    const validationError = validateMenuItem(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    const { name, price, category } = req.body;
    const existingItem = menu.find(item => item.name === name);

    if (existingItem) {
        existingItem.price = price;
        existingItem.category = category;
        return res.status(200).json({ message: 'Menu item updated successfully.' });
    }

    const newItem = {
        id: menu.length + 1,
        name,
        price,
        category
    };
    menu.push(newItem);
    res.status(201).json({ message: 'Menu item added successfully.' });
});

// Retrieve menu items
app.get('/menu', (req, res) => {
    res.json(menu);
});

// Place an order
app.post('/orders', (req, res) => {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Items must be an array of menu item IDs.' });
    }

    const invalidItems = items.filter(id => !menu.some(item => item.id === id));
    if (invalidItems.length > 0) {
        return res.status(400).json({ error: `Invalid item IDs: ${invalidItems.join(', ')}` });
    }

    const newOrder = {
        id: orders.length + 1,
        items,
        status: 'Preparing',
        createdAt: new Date().toISOString()
    };
    orders.push(newOrder);
    res.status(201).json({ message: 'Order placed successfully.', orderId: newOrder.id });
});

// Fetch details of a specific order
app.get('/orders/:id', (req, res) => {
    const orderId = parseInt(req.params.id, 10);
    const order = findOrderById(orderId);

    if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
    }

    const orderDetails = {
        id: order.id,
        status: order.status,
        createdAt: order.createdAt,
        items: order.items.map(itemId => menu.find(item => item.id === itemId))
    };
    res.json(orderDetails);
});

// CRON job to update order statuses
cron.schedule('* * * * *', () => { // Runs every minute
    orders.forEach(order => {
        if (order.status !== 'Delivered') {
            const currentIndex = statuses.indexOf(order.status);
            order.status = statuses[currentIndex + 1] || 'Delivered';
        }
    });
    console.log('Order statuses updated.');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

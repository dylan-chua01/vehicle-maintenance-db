const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
app.use(cors());

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/fleet_maintenance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Define Mongoose schemas and models
const vehicleSchema = new mongoose.Schema({
    year: Number,
    make: String,
    model: String,
    plate: String,
    status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance', 'retired'],
        default: 'active'
    },
    fuelType: {
        type: String,
        enum: ['regular', 'premium', 'diesel', 'electric'],
        default: 'regular'
    },
    tankCapacity: Number,
    location: String,
    acquisitionDate: Date,
    disposalDate: Date,
    currentMileage: Number,
    lastServiceDate: Date,
    nextServiceDate: Date,
    maintenanceAlerts: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const maintenanceLogSchema = new mongoose.Schema({
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    odometer: {
        type: Number,
        required: true
    },
    serviceProvider: String,
    cost: Number,
    nextServiceDue: Date,
    notes: String
}, { timestamps: true });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const MaintenanceLog = mongoose.model('MaintenanceLog', maintenanceLogSchema);

// API Routes

// Get all vehicles
app.get('/api/vehicles', async (req, res) => {
    try {
        const vehicles = await Vehicle.find().sort({ make: 1, model: 1 });
        res.json(vehicles);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single vehicle
app.get('/api/vehicles/:id', async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }
        res.json(vehicle);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create new vehicle
app.post('/api/vehicles', async (req, res) => {
    try {
        const vehicle = new Vehicle(req.body);
        const savedVehicle = await vehicle.save();
        res.status(201).json(savedVehicle);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update vehicle
app.put('/api/vehicles/:id', async (req, res) => {
    try {
        const vehicle = await Vehicle.findByIdAndUpdate(
            req.params.id, 
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }
        
        // If the update includes current mileage and it's greater than before,
        // update the last service date if maintenance was performed
        if (req.body.currentMileage) {
            // This could trigger updates to maintenance schedules based on mileage
            // Additional business logic could be implemented here
        }
        
        res.json(vehicle);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete vehicle
app.delete('/api/vehicles/:id', async (req, res) => {
    try {
        const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
        
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }
        
        // Also delete all maintenance logs for this vehicle
        await MaintenanceLog.deleteMany({ vehicleId: req.params.id });
        
        res.json({ message: 'Vehicle deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get maintenance logs for a vehicle
app.get('/api/vehicles/:id/logs', async (req, res) => {
    try {
        const logs = await MaintenanceLog.find({ 
            vehicleId: req.params.id 
        }).sort({ date: -1 }); // Most recent first
        
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create new maintenance log
app.post('/api/logs', async (req, res) => {
    try {
        const log = new MaintenanceLog(req.body);
        const savedLog = await log.save();
        
        // Update vehicle's mileage and service dates if the new log has more recent information
        const vehicle = await Vehicle.findById(req.body.vehicleId);
        
        if (vehicle) {
            // Update if the odometer reading is higher
            if (req.body.odometer > vehicle.currentMileage) {
                vehicle.currentMileage = req.body.odometer;
            }
            
            // Update last service date if this log is more recent
            const logDate = new Date(req.body.date);
            if (!vehicle.lastServiceDate || logDate > vehicle.lastServiceDate) {
                vehicle.lastServiceDate = logDate;
            }
            
            // Update next service date if provided
            if (req.body.nextServiceDue) {
                vehicle.nextServiceDate = new Date(req.body.nextServiceDue);
            }
            
            await vehicle.save();
        }
        
        res.status(201).json(savedLog);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update maintenance log
app.put('/api/logs/:id', async (req, res) => {
    try {
        const log = await MaintenanceLog.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!log) {
            return res.status(404).json({ message: 'Log entry not found' });
        }
        
        // Update vehicle information if needed
        // Similar logic to POST route above
        const vehicle = await Vehicle.findById(req.body.vehicleId);
        
        if (vehicle) {
            // Check if this is the most recent log entry
            const latestLog = await MaintenanceLog.findOne({ 
                vehicleId: req.body.vehicleId 
            }).sort({ odometer: -1 }).limit(1);
            
            if (latestLog && latestLog._id.toString() === req.params.id) {
                vehicle.currentMileage = req.body.odometer;
                
                if (req.body.nextServiceDue) {
                    vehicle.nextServiceDate = new Date(req.body.nextServiceDue);
                }
                
                await vehicle.save();
            }
        }
        
        res.json(log);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete maintenance log
app.delete('/api/logs/:id', async (req, res) => {
    try {
        const log = await MaintenanceLog.findByIdAndDelete(req.params.id);
        
        if (!log) {
            return res.status(404).json({ message: 'Log entry not found' });
        }
        
        res.json({ message: 'Log entry deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Serve index.html for any other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
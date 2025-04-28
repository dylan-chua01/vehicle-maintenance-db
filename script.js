document.addEventListener('DOMContentLoaded', function() {
    // Load all vehicles when the page loads
    fetchVehicles();
    
    // Toggle edit mode for vehicle info
    const toggleEditBtn = document.getElementById('toggle-edit');
    const saveBtn = document.getElementById('save-vehicle');
    const cancelBtn = document.getElementById('cancel-edit');
    const formInputs = document.querySelectorAll('.form-input');
    let originalVehicleData = {}; // Store original data for cancellation
    
    toggleEditBtn.addEventListener('click', function() {
        // Store original values before editing
        formInputs.forEach(input => {
            originalVehicleData[input.id] = input.value;
            input.disabled = false;
        });
        toggleEditBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
    });
    
    cancelBtn.addEventListener('click', function() {
        // Restore original values
        formInputs.forEach(input => {
            input.value = originalVehicleData[input.id] || '';
            input.disabled = true;
        });
        toggleEditBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
    });
    
    saveBtn.addEventListener('click', function() {
        const vehicleId = document.getElementById('vehicle-select').value;
        if (!vehicleId) return;
        
        // Collect vehicle data from form
        const vehicleData = {
            year: parseInt(document.getElementById('input-year').value) || 0,
            make: document.getElementById('input-brand').value,
            model: document.getElementById('input-model').value,
            plate: document.getElementById('input-plate').value,
            status: document.getElementById('input-status').value,
            fuelType: document.getElementById('input-fuel-type').value,
            tankCapacity: parseFloat(document.getElementById('input-tank-capacity').value) || 0,
            location: document.getElementById('input-location').value,
            acquisitionDate: document.getElementById('input-acquisition-date').value || null,
            currentMileage: parseInt(document.getElementById('input-mileage').value) || 0,
            lastServiceDate: document.getElementById('input-last-service').value || null,
            nextServiceDate: document.getElementById('input-next-service').value || null,
            maintenanceAlerts: document.getElementById('input-notifications').checked
        };
        
        // Update vehicle in database
        updateVehicle(vehicleId, vehicleData);
        
        // Disable form inputs
        formInputs.forEach(input => {
            input.disabled = true;
        });
        toggleEditBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
    });
    
    // Toggle other description field
    const serviceDescription = document.getElementById('service-description');
    const otherDescription = document.getElementById('service-description-other');
    
    serviceDescription.addEventListener('change', function() {
        if (this.value === 'other') {
            otherDescription.style.display = 'block';
            otherDescription.required = true;
        } else {
            otherDescription.style.display = 'none';
            otherDescription.required = false;
        }
    });
    
    // Modal functionality
    const modal = document.getElementById('entry-modal');
    const vehicleModal = document.getElementById('vehicle-modal');
    const addLogBtn = document.getElementById('add-log-entry');
    const closeBtns = document.querySelectorAll('.close');
    const cancelEntryBtn = document.getElementById('cancel-entry');
    const cancelVehicleBtn = document.getElementById('cancel-vehicle');
    
    // Open maintenance log modal
    addLogBtn.addEventListener('click', function() {
        const vehicleId = document.getElementById('vehicle-select').value;
        if (!vehicleId) {
            alert('Please select a vehicle first.');
            return;
        }
        
        document.getElementById('modal-title').textContent = 'Add Maintenance Entry';
        document.getElementById('entry-id').value = '';
        // Reset form
        document.getElementById('maintenance-form').reset();
        // Set today's date as default
        document.getElementById('service-date').value = new Date().toISOString().split('T')[0];
        modal.style.display = 'block';
    });
    
    // Close modals
    function closeModal(modalElement) {
        modalElement.style.display = 'none';
    }
    
    closeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });
    
    cancelEntryBtn.addEventListener('click', function() {
        closeModal(modal);
    });
    
    cancelVehicleBtn.addEventListener('click', function() {
        closeModal(vehicleModal);
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal(modal);
        }
        if (event.target === vehicleModal) {
            closeModal(vehicleModal);
        }
    });
    
    // Event delegation for dynamic buttons
    document.getElementById('log-entries').addEventListener('click', function(e) {
        // Edit entry buttons
        if (e.target.closest('.edit-entry')) {
            const btn = e.target.closest('.edit-entry');
            const row = btn.closest('tr');
            document.getElementById('modal-title').textContent = 'Edit Maintenance Entry';
            
            // Get entry ID from data attribute
            const entryId = row.getAttribute('data-id');
            document.getElementById('entry-id').value = entryId;
            
            // Fill form with existing data
            document.getElementById('service-date').value = row.cells[0].textContent;
            document.getElementById('service-odometer').value = row.cells[2].textContent.replace(/,/g, '');
            
            // Handle description field
            const description = row.cells[1].textContent.trim();
            const descriptionSelect = document.getElementById('service-description');
            
            // Check if the description matches any of the predefined options
            let descriptionMatched = false;
            for (let i = 0; i < descriptionSelect.options.length; i++) {
                if (descriptionSelect.options[i].value === description && description !== 'other') {
                    descriptionSelect.value = description;
                    document.getElementById('service-description-other').style.display = 'none';
                    document.getElementById('service-description-other').required = false;
                    descriptionMatched = true;
                    break;
                }
            }
            
            // If no match, set to "other" and display the other field
            if (!descriptionMatched) {
                descriptionSelect.value = 'other';
                document.getElementById('service-description-other').value = description;
                document.getElementById('service-description-other').style.display = 'block';
                document.getElementById('service-description-other').required = true;
            }
            
            document.getElementById('service-provider').value = row.cells[3].textContent;
            document.getElementById('service-cost').value = row.cells[4].textContent.replace('$', '');
            document.getElementById('service-next-due').value = row.cells[5].textContent;
            
            modal.style.display = 'block';
        }
        
        // Delete entry buttons
        if (e.target.closest('.delete-entry')) {
            const btn = e.target.closest('.delete-entry');
            const row = btn.closest('tr');
            
            if (confirm('Are you sure you want to delete this maintenance entry?')) {
                const entryId = row.getAttribute('data-id');
                deleteMaintenanceLog(entryId, row);
            }
        }
    });
    
    // Form submission for maintenance entries
    document.getElementById('maintenance-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const vehicleId = document.getElementById('vehicle-select').value;
        if (!vehicleId) {
            alert('Please select a vehicle first.');
            return;
        }
        
        // Get form values
        const date = document.getElementById('service-date').value;
        const odometer = parseInt(document.getElementById('service-odometer').value) || 0;
        const description = document.getElementById('service-description').value === 'other' 
            ? document.getElementById('service-description-other').value 
            : document.getElementById('service-description').value;
        const provider = document.getElementById('service-provider').value;
        const cost = parseFloat(document.getElementById('service-cost').value) || 0;
        const nextDue = document.getElementById('service-next-due').value;
        const notes = document.getElementById('service-notes').value;
        const entryId = document.getElementById('entry-id').value;
        
        // Create log entry object
        const logEntry = {
            vehicleId: vehicleId,
            date: date,
            description: description,
            odometer: odometer,
            serviceProvider: provider,
            cost: cost,
            nextServiceDue: nextDue,
            notes: notes
        };
        
        if (entryId) {
            // Update existing entry
            updateMaintenanceLog(entryId, logEntry);
        } else {
            // Add new entry
            createMaintenanceLog(logEntry);
        }
        
        // Close modal
        closeModal(modal);
    });
    
    // Vehicle selection functionality
    const vehicleSelect = document.getElementById('vehicle-select');
    
    vehicleSelect.addEventListener('change', function() {
        if (this.value === 'new') {
            // Reset form and open vehicle modal
            document.getElementById('vehicle-modal-title').textContent = 'Add New Vehicle';
            document.getElementById('edit-vehicle-id').value = '';
            document.getElementById('new-vehicle-form').reset();
            vehicleModal.style.display = 'block';
            this.value = '';
        } else if (this.value) {
            // Load the selected vehicle and its maintenance logs
            loadVehicleData(this.value);
            fetchMaintenanceLogs(this.value);
        } else {
            // Clear the maintenance logs table if no vehicle is selected
            document.getElementById('log-entries').innerHTML = '';
        }
    });
    
    // Form submission for new vehicles
    document.getElementById('new-vehicle-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const vehicleData = {
            year: parseInt(document.getElementById('new-vehicle-year').value) || new Date().getFullYear(),
            make: document.getElementById('new-vehicle-make').value,
            model: document.getElementById('new-vehicle-model').value,
            plate: document.getElementById('new-vehicle-plate').value,
            status: document.getElementById('new-vehicle-status').value || 'active'
        };
        
        const vehicleId = document.getElementById('edit-vehicle-id').value;
        
        if (vehicleId) {
            // Update existing vehicle
            updateVehicle(vehicleId, vehicleData);
        } else {
            // Create new vehicle
            createVehicle(vehicleData);
        }
        
        // Close modal
        closeModal(vehicleModal);
    });
    
    // API Functions
    
    // Fetch all vehicles
    async function fetchVehicles() {
        try {
            const response = await fetch('/api/vehicles');
            if (!response.ok) {
                throw new Error('Failed to fetch vehicles');
            }
            
            const vehicles = await response.json();
            populateVehicleDropdown(vehicles);
            
            // If we have vehicles, select the first one
            if (vehicles.length > 0) {
                vehicleSelect.value = vehicles[0]._id;
                loadVehicleData(vehicles[0]._id);
                fetchMaintenanceLogs(vehicles[0]._id);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to load vehicles. Please check the server connection.');
        }
    }
    
    // Load specific vehicle data
    async function loadVehicleData(vehicleId) {
        try {
            const response = await fetch(`/api/vehicles/${vehicleId}`);
            if (!response.ok) {
                throw new Error('Failed to load vehicle data');
            }
            
            const vehicle = await response.json();
            
            // Populate vehicle info form
            document.getElementById('input-year').value = vehicle.year || '';
            document.getElementById('input-brand').value = vehicle.make || '';
            document.getElementById('input-model').value = vehicle.model || '';
            document.getElementById('input-plate').value = vehicle.plate || '';
            document.getElementById('input-status').value = vehicle.status || 'active';
            document.getElementById('input-fuel-type').value = vehicle.fuelType || 'regular';
            document.getElementById('input-tank-capacity').value = vehicle.tankCapacity || '';
            document.getElementById('input-location').value = vehicle.location || '';
            document.getElementById('input-acquisition-date').value = vehicle.acquisitionDate ? new Date(vehicle.acquisitionDate).toISOString().split('T')[0] : '';
            document.getElementById('input-mileage').value = vehicle.currentMileage || 0;
            document.getElementById('input-last-service').value = vehicle.lastServiceDate ? new Date(vehicle.lastServiceDate).toISOString().split('T')[0] : '';
            document.getElementById('input-next-service').value = vehicle.nextServiceDate ? new Date(vehicle.nextServiceDate).toISOString().split('T')[0] : '';
            document.getElementById('input-notifications').checked = vehicle.maintenanceAlerts !== false;
            
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to load vehicle details.');
        }
    }
    
    // Fetch maintenance logs for a vehicle
    async function fetchMaintenanceLogs(vehicleId) {
        try {
            const response = await fetch(`/api/vehicles/${vehicleId}/logs`);
            if (!response.ok) {
                throw new Error('Failed to fetch maintenance logs');
            }
            
            const logs = await response.json();
            populateMaintenanceLogs(logs);
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to load maintenance logs.');
        }
    }
    
    // Create a new vehicle
    async function createVehicle(vehicleData) {
        try {
            const response = await fetch('/api/vehicles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(vehicleData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to create vehicle');
            }
            
            const newVehicle = await response.json();
            
            // Refresh the vehicle list
            fetchVehicles();
            
            // Select the new vehicle
            setTimeout(() => {
                document.getElementById('vehicle-select').value = newVehicle._id;
                loadVehicleData(newVehicle._id);
                document.getElementById('log-entries').innerHTML = ''; // Clear logs
            }, 500);
            
            alert('Vehicle added successfully!');
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to add vehicle. ' + error.message);
        }
    }
    
    // Update an existing vehicle
    async function updateVehicle(vehicleId, vehicleData) {
        try {
            const response = await fetch(`/api/vehicles/${vehicleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(vehicleData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to update vehicle');
            }
            
            // Refresh the vehicle list to update any name changes
            fetchVehicles();
            
            alert('Vehicle updated successfully!');
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to update vehicle. ' + error.message);
        }
    }
    
    // Create a new maintenance log entry
    async function createMaintenanceLog(logData) {
        try {
            const response = await fetch('/api/logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to create maintenance log entry');
            }
            
            const newLog = await response.json();
            
            // Refresh the logs for the current vehicle
            fetchMaintenanceLogs(logData.vehicleId);
            
            // Refresh the vehicle data to get updated mileage, etc.
            loadVehicleData(logData.vehicleId);
            
            alert('Maintenance entry added successfully!');
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to add maintenance entry. ' + error.message);
        }
    }
    
    // Update an existing maintenance log entry
    async function updateMaintenanceLog(logId, logData) {
        try {
            const response = await fetch(`/api/logs/${logId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to update maintenance log entry');
            }
            
            // Refresh the logs for the current vehicle
            fetchMaintenanceLogs(logData.vehicleId);
            
            // Refresh the vehicle data
            loadVehicleData(logData.vehicleId);
            
            alert('Maintenance entry updated successfully!');
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to update maintenance entry. ' + error.message);
        }
    }
    
    // Delete a maintenance log entry
    async function deleteMaintenanceLog(logId, rowElement) {
        try {
            const response = await fetch(`/api/logs/${logId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete maintenance log entry');
            }
            
            // Remove row from table
            rowElement.remove();
            
            alert('Maintenance entry deleted successfully!');
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to delete maintenance entry. ' + error.message);
        }
    }

    // Delete Vehicle Button Click Handler
    document.getElementById('delete-vehicle').addEventListener('click', function() {
    const vehicleId = document.getElementById('vehicle-select').value;
    
    if (!vehicleId || vehicleId === 'new') {
        alert('Please select a vehicle to delete');
        return;
    }
    
    if (confirm('Are you sure you want to delete this vehicle? This will also delete all its maintenance records.')) {
        deleteVehicle(vehicleId);
    }
});

// Function to delete a vehicle
async function deleteVehicle(vehicleId) {
    try {
        // Show loading state
        const deleteBtn = document.getElementById('delete-vehicle');
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        
        const response = await fetch(`/api/vehicles/${vehicleId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        // Refresh the vehicle list
        await fetchVehicles();
        
        // Clear the current vehicle display
        document.getElementById('vehicle-select').value = '';
        document.getElementById('vehicle-form').reset();
        document.getElementById('log-entries').innerHTML = '';
        
        alert('Vehicle and all its maintenance records deleted successfully!');
    } catch (error) {
        console.error('Error details:', error);
        alert(`Failed to delete vehicle: ${error.message}\n\nCheck console for details.`);
    } finally {
        // Reset button state
        const deleteBtn = document.getElementById('delete-vehicle');
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Vehicle';
    }
}
    
    // Helper function to populate vehicle dropdown
    function populateVehicleDropdown(vehicles) {
        const select = document.getElementById('vehicle-select');
        
        // Clear existing options except the default and "Add New" options
        while (select.options.length > 2) {
            select.remove(1);
        }
        
        // Add vehicles to dropdown
        vehicles.forEach(vehicle => {
            const option = document.createElement('option');
            option.value = vehicle._id;
            option.textContent = `${vehicle.plate} - ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
            
            // Insert before the "Add New Vehicle" option
            select.insertBefore(option, select.options[select.options.length - 1]);
        });
    }
    
    // Helper function to populate maintenance logs table
    function populateMaintenanceLogs(logs) {
        const tbody = document.getElementById('log-entries');
        tbody.innerHTML = ''; // Clear existing logs
        
        if (logs.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="7" class="text-center">No maintenance records found</td>';
            tbody.appendChild(emptyRow);
            return;
        }
        
        logs.forEach(log => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', log._id);
            
            const date = new Date(log.date).toISOString().split('T')[0];
            const nextDue = log.nextServiceDue ? 
                new Date(log.nextServiceDue).toISOString().split('T')[0] : '';
            
            row.innerHTML = `
                <td>${date}</td>
                <td>${log.description}</td>
                <td>${log.odometer.toLocaleString()}</td>
                <td>${log.serviceProvider || ''}</td>
                <td>$${log.cost ? parseFloat(log.cost).toFixed(2) : '0.00'}</td>
                <td>${nextDue}</td>
                <td>
                    <button class="btn-icon edit-entry" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete-entry" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const vehicleSelect = document.getElementById('vehicle-select');
    const vehicleInfoCard = document.querySelector('.vehicle-info');
    const maintenanceLogCard = document.querySelector('.maintenance-log');

    // Function to show/hide based on selection
    function updateVisibility() {
        const selectedValue = vehicleSelect.value;
        if (selectedValue === '') {
            vehicleInfoCard.style.display = 'none';
            maintenanceLogCard.style.display = 'none';
        } else {
            vehicleInfoCard.style.display = 'block';
            maintenanceLogCard.style.display = 'block';
        }
    }

    // Initialize visibility on page load
    updateVisibility();

    // Update visibility whenever selection changes
    vehicleSelect.addEventListener('change', updateVisibility);
});
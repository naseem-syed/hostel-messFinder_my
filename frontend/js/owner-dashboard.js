// ===================================
// HOSTEL OWNER DASHBOARD
// ===================================

let ownerMess = null;

document.addEventListener('DOMContentLoaded', async () => {
    protectRoute(); // Protect this page for logged-in users
    await loadOwnerData();
    setupEventListeners();
});

async function loadOwnerData() {
    try {
        const user = await getCurrentUser();
        document.getElementById('ownerName').textContent = user.name;

        // Setup sidebar avatar (initials or photo)
        const avatarDiv = document.querySelector('.user-avatar');
        if (!avatarDiv) {
            // Some versions of owner-dashboard don't have .user-avatar, let's skip if not found
        } else {
            if (user.photo_url) {
                avatarDiv.innerHTML = `<img src="${user.photo_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                avatarDiv.textContent = initials || 'ON';
            }
        }

        console.log('loadOwnerData - Current user ID:', user.id);
        console.log('loadOwnerData - Fetching mess from:', `${API_BASE_URL}/messes/owner/my-mess`);
        console.log('loadOwnerData - Auth headers:', getAuthHeaders());

        // Check if owner has a mess
        const messResponse = await fetch(`${API_BASE_URL}/messes/owner/my-mess`, {
            headers: getAuthHeaders()
        });

        console.log('loadOwnerData - Response status:', messResponse.status);

        if (messResponse.ok) {
            const messData = await messResponse.json();
            console.log('loadOwnerData - Mess data:', messData);
            
            if (messData.success && messData.data) {
                ownerMess = messData.data;
                console.log('loadOwnerData - Mess found:', ownerMess._id);
                document.getElementById('noListing').style.display = 'none';
                document.getElementById('listingDetails').style.display = 'block';
                document.getElementById('studentsTabBtn').style.display = 'block';
                document.getElementById('reviewsTabBtn').style.display = 'block';
                displayListingDetails();
                populateSettingsForm();
                
                // Load additional data
                setupStudentManagement();
                loadYourStudents(); // Unified list
                loadPendingReviews();
            } else {
                // No mess yet
                console.log('loadOwnerData - No mess data in response');
                document.getElementById('noListing').style.display = 'block';
                document.getElementById('listingDetails').style.display = 'none';
            }
        } else {
            // No mess yet or error
            const errorData = await messResponse.json();
            console.warn('loadOwnerData - Failed to fetch mess:', messResponse.status, errorData);
            document.getElementById('noListing').style.display = 'block';
            document.getElementById('listingDetails').style.display = 'none';
        }
    } catch (error) {
        console.error('loadOwnerData - Error:', error);
        document.getElementById('noListing').style.display = 'block';
    }
}

function displayListingDetails() {
    if (!ownerMess) return;

    const container = document.getElementById('listingDetails');
    const schedule = ownerMess.foodSchedule || {};
    const scheduleRows = [
        { label: 'Breakfast', key: 'breakfast' },
        { label: 'Lunch', key: 'lunch' },
        { label: 'Dinner', key: 'dinner' },
        { label: 'Snacks', key: 'snacks' }
    ].map(({ label, key }) => {
        const item = schedule[key] || {};
        const availableText = item.available ? 'Yes' : 'No';
        const timeText = item.time || '-';
        const descText = item.description || '-';
        return `
            <tr>
                <td>${label}</td>
                <td>${availableText}</td>
                <td>${timeText}</td>
                <td>${descText}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div>
            <h3>${ownerMess.name}</h3>
            <p><strong>Location:</strong> ${ownerMess.location}</p>
            <p><strong>Price:</strong> Rs ${ownerMess.monthlyPrice}/month</p>
            <p><strong>Food Type:</strong> ${ownerMess.foodType}</p>
            <p><strong>Phone:</strong> ${ownerMess.phoneNumber || 'Not set'}</p>
            <p><strong>Website:</strong> ${ownerMess.website || 'Not set'}</p>
            <p><strong>Description:</strong> ${ownerMess.description || 'Not set'}</p>
            <h4 style="margin-top: 15px;">Meal Schedule</h4>
            <table class="schedule-table">
                <thead>
                    <tr>
                        <th>Meal</th>
                        <th>Available</th>
                        <th>Time</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${scheduleRows}
                </tbody>
            </table>
        </div>
    `;
}

function switchTab(tabName, buttonEl) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    if (buttonEl) {
        buttonEl.classList.add('active');
    }
}

function editListing() {
    if (!ownerMess) return;

    document.getElementById('settingsName').value = ownerMess.name;
    document.getElementById('settingsPhone').value = ownerMess.phoneNumber || '';
    document.getElementById('settingsWebsite').value = ownerMess.website || '';
    document.getElementById('settingsDescription').value = ownerMess.description || '';

    document.querySelectorAll('.tab-btn')[1].click(); // Switch to settings tab
}

function setupEventListeners() {
    document.getElementById('logoutLink').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    // Add mess form submission
    const messForm = document.getElementById('messForm');
    if (messForm) {
        messForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validate required fields
            const messName = document.getElementById('messName').value.trim();
            const messAddress = document.getElementById('messAddress').value.trim();
            const messLocation = document.getElementById('messLocation').value.trim();
            const messContact = document.getElementById('messContact').value.trim();
            const messPrice = document.getElementById('messPrice').value;
            const messFoodType = document.getElementById('messFoodType').value;
            const messDescription = document.getElementById('messDescription').value.trim();
            
            if (!messName || !messAddress || !messLocation || !messContact || !messPrice || !messFoodType || !messDescription) {
                alert('Please fill in all required fields (marked with *)');
                return;
            }
            
            // Validate phone number (10 digits)
            if (!/^\d{10}$/.test(messContact.replace(/\D/g, ''))) {
                alert('Please enter a valid 10-digit phone number');
                return;
            }
            
            // Validate price is positive
            if (parseInt(messPrice) <= 0) {
                alert('Monthly price must be greater than 0');
                return;
            }
            
            const messData = {
                name: messName,
                address: messAddress,
                location: messLocation,
                phoneNumber: messContact,
                monthlyPrice: parseInt(messPrice),
                foodType: messFoodType,
                capacity: document.getElementById('messCapacity').value ? parseInt(document.getElementById('messCapacity').value) : undefined,
                description: messDescription,
                facilities: document.getElementById('messFacilities').value.split(',').map(f => f.trim()).filter(f => f),
                foodSchedule: {
                    breakfast: {
                        available: document.getElementById('breakfastAvailable').checked,
                        time: document.getElementById('breakfastTime').value,
                        description: document.getElementById('breakfastDesc').value
                    },
                    lunch: {
                        available: document.getElementById('lunchAvailable').checked,
                        time: document.getElementById('lunchTime').value,
                        description: document.getElementById('lunchDesc').value
                    },
                    dinner: {
                        available: document.getElementById('dinnerAvailable').checked,
                        time: document.getElementById('dinnerTime').value,
                        description: document.getElementById('dinnerDesc').value
                    },
                    snacks: {
                        available: document.getElementById('snacksAvailable').checked,
                        time: document.getElementById('snacksTime').value,
                        description: document.getElementById('snacksDesc').value
                    }
                }
            };

            try {
                // Show loading state
                const submitBtn = messForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Saving...';
                submitBtn.disabled = true;

                const response = await fetch(`${API_BASE_URL}/messes`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(messData)
                });

                const data = await response.json();

                if (data.success) {
                    alert('Mess details added successfully!');
                    messForm.reset();
                    location.reload();
                } else {
                    alert('Error: ' + (data.message || 'Failed to add mess'));
                }
                
                // Restore button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            } catch (error) {
                console.error('Error adding mess:', error);
                alert('Error adding mess: ' + error.message);
                
                // Restore button state
                const submitBtn = messForm.querySelector('button[type="submit"]');
                submitBtn.textContent = 'Save Mess Details';
                submitBtn.disabled = false;
            }
        });
    }

    document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const settingsName = document.getElementById('settingsName').value.trim();
        const settingsPhone = document.getElementById('settingsPhone').value.trim();
        const settingsWebsite = document.getElementById('settingsWebsite').value.trim();
        const settingsDescription = document.getElementById('settingsDescription').value.trim();
        
        // Validate phone if provided
        if (settingsPhone && !/^\d{10}$/.test(settingsPhone.replace(/\D/g, ''))) {
            alert('Please enter a valid 10-digit phone number');
            return;
        }
        
        const updates = {
            name: settingsName,
            phoneNumber: settingsPhone,
            website: settingsWebsite,
            description: settingsDescription,
            foodSchedule: {
                breakfast: {
                    available: document.getElementById('settingsBreakfastAvailable').checked,
                    time: document.getElementById('settingsBreakfastTime').value,
                    description: document.getElementById('settingsBreakfastDesc').value
                },
                lunch: {
                    available: document.getElementById('settingsLunchAvailable').checked,
                    time: document.getElementById('settingsLunchTime').value,
                    description: document.getElementById('settingsLunchDesc').value
                },
                dinner: {
                    available: document.getElementById('settingsDinnerAvailable').checked,
                    time: document.getElementById('settingsDinnerTime').value,
                    description: document.getElementById('settingsDinnerDesc').value
                },
                snacks: {
                    available: document.getElementById('settingsSnacksAvailable').checked,
                    time: document.getElementById('settingsSnacksTime').value,
                    description: document.getElementById('settingsSnacksDesc').value
                }
            }
        };

        try {
            // Show loading state
            const submitBtn = document.querySelector('#settingsForm button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Updating...';
            submitBtn.disabled = true;

            const response = await fetch(`${API_BASE_URL}/messes/${ownerMess._id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                alert('Listing updated successfully!');
                await loadOwnerData();
                
                // Restore button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            } else {
                alert('Error updating listing');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            alert('Error updating listing: ' + error.message);
            
            // Restore button state
            const submitBtn = document.querySelector('#settingsForm button[type="submit"]');
            submitBtn.textContent = 'Save Changes';
            submitBtn.disabled = false;
        }
    });
}

function showAddMessForm() {
    document.getElementById('noListing').style.display = 'none';
    document.getElementById('addMessForm').style.display = 'block';
}

function cancelAddMess() {
    document.getElementById('addMessForm').style.display = 'none';
    document.getElementById('noListing').style.display = 'block';
}

function populateSettingsForm() {
    if (!ownerMess) return;

    document.getElementById('settingsName').value = ownerMess.name || '';
    document.getElementById('settingsPhone').value = ownerMess.phoneNumber || '';
    document.getElementById('settingsWebsite').value = ownerMess.website || '';
    document.getElementById('settingsDescription').value = ownerMess.description || '';

    const schedule = ownerMess.foodSchedule || {};
    const breakfast = schedule.breakfast || {};
    const lunch = schedule.lunch || {};
    const dinner = schedule.dinner || {};
    const snacks = schedule.snacks || {};

    document.getElementById('settingsBreakfastAvailable').checked = Boolean(breakfast.available);
    document.getElementById('settingsBreakfastTime').value = breakfast.time || '';
    document.getElementById('settingsBreakfastDesc').value = breakfast.description || '';

    document.getElementById('settingsLunchAvailable').checked = Boolean(lunch.available);
    document.getElementById('settingsLunchTime').value = lunch.time || '';
    document.getElementById('settingsLunchDesc').value = lunch.description || '';

    document.getElementById('settingsDinnerAvailable').checked = Boolean(dinner.available);
    document.getElementById('settingsDinnerTime').value = dinner.time || '';
    document.getElementById('settingsDinnerDesc').value = dinner.description || '';

    document.getElementById('settingsSnacksAvailable').checked = Boolean(snacks.available);
    document.getElementById('settingsSnacksTime').value = snacks.time || '';
    document.getElementById('settingsSnacksDesc').value = snacks.description || '';
}

// ===================================
// NEW OWNER FEATURES
// ===================================

let currentStudentPhotoBase64 = null;

function setupStudentManagement() {
    const photoInput = document.getElementById('studentPhotoInput');
    const photoPreview = document.getElementById('studentPhotoPreview');

    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                currentStudentPhotoBase64 = reader.result;
                photoPreview.src = currentStudentPhotoBase64;
                photoPreview.style.display = 'block';
            };
        });
    }

    const studentEmailInput = document.getElementById('studentEmail');
    if (studentEmailInput) {
        studentEmailInput.addEventListener('blur', async () => {
            const email = studentEmailInput.value.trim();
            if (!email || !email.includes('@')) return;

            try {
                const res = await fetch(`${API_BASE_URL}/messes/owner/search-student?email=${encodeURIComponent(email)}`, {
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                
                if (data.success && data.user) {
                    const phoneInput = document.getElementById('studentPhone');
                    if (phoneInput) phoneInput.value = data.user.phone || '';
                    
                    const msgObj = document.getElementById('studentMessage');
                    msgObj.textContent = `Found registered student: ${data.user.name}. Phone number auto-filled!`;
                    
                    // If student has a photo, show it as suggested
                    if (data.user.photo_url) {
                        const preview = document.getElementById('studentPhotoPreview');
                        if (preview && !currentStudentPhotoBase64) {
                            preview.src = data.user.photo_url;
                            preview.style.display = 'block';
                            currentStudentPhotoBase64 = data.user.photo_url;
                        }
                    }
                } else {
                    document.getElementById('studentMessage').textContent = 'Note: This student has not registered yet. Data will be saved as provided.';
                }
            } catch (err) {
                console.warn('Silent failure fetching student info', err);
            }
        });
    }

    const form = document.getElementById('addStudentForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('studentEmail').value;
            const phone = document.getElementById('studentPhone').value;
            const msgObj = document.getElementById('studentMessage');
            const errObj = document.getElementById('studentError');
            
            msgObj.textContent = '';
            errObj.textContent = '';

            if (!currentStudentPhotoBase64) {
                errObj.textContent = 'Please select a student profile photo.';
                return;
            }

            try {
                const submitBtn = document.getElementById('addStudentBtn');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Verifying & Adding...';

                const response = await fetch(`${API_BASE_URL}/messes/${ownerMess._id}/students`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        student_email: email,
                        phone: phone,
                        photo_url: currentStudentPhotoBase64
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    msgObj.textContent = 'Student verified and added successfully.';
                    form.reset();
                    const photoPreview = document.getElementById('studentPhotoPreview');
                    if (photoPreview) photoPreview.style.display = 'none';
                    currentStudentPhotoBase64 = null;
                    await loadVerifiedStudents();
                    await loadOwnerData(); // Refresh to update joined list
                } else {
                    errObj.textContent = data.message || 'Error adding student.';
                }
            } catch (error) {
                errObj.textContent = 'System error.';
            } finally {
                const submitBtn = document.getElementById('addStudentBtn');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Verify & Add Student';
            }
        });
    }
}

async function loadYourStudents() {
    if (!ownerMess) return;
    const container = document.getElementById('yourStudentsList');
    const section = document.getElementById('yourStudentsSection');
    if (!container || !section) return;

    try {
        // 1. Fetch Verified Students (manual)
        const vResponse = await fetch(`${API_BASE_URL}/messes/${ownerMess._id}/students`, {
            headers: getAuthHeaders()
        });
        const vData = await vResponse.json();
        const verified = vData.success ? vData.data : [];

        // 2. Fetch Joined Students (via browse)
        const jResponse = await fetch(`${API_BASE_URL}/students/joined/${ownerMess._id}`, {
            headers: getAuthHeaders()
        });
        const jData = await jResponse.json();
        const joined = jData.success ? jData.data : [];

        // Combine and Deduplicate by Email
        const allStudentsMap = new Map();

        // Process Joined first
        joined.forEach(s => {
            allStudentsMap.set(s.email.toLowerCase(), {
                ...s,
                student_email: s.email,
                isJoined: true,
                isVerified: false // Default, will override if in verified list
            });
        });

        // Process Verified
        verified.forEach(s => {
            const email = s.student_email.toLowerCase();
            const existing = allStudentsMap.get(email);
            if (existing) {
                allStudentsMap.set(email, { ...existing, ...s, isVerified: true });
            } else {
                allStudentsMap.set(email, { ...s, isVerified: true, isJoined: false });
            }
        });

        const allStudents = Array.from(allStudentsMap.values());

        if (allStudents.length > 0) {
            section.style.display = 'block';
            container.innerHTML = allStudents.map(student => {
                const tags = [];
                if (student.isVerified) tags.push('<span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700;">Verified</span>');
                if (student.isJoined) tags.push('<span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700;">Joined</span>');
                
                const studentEmail = student.student_email || student.email;
                const studentName = student.name || student.registeredName || studentEmail.split('@')[0];
                const studentPhoto = student.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(studentEmail)}`;

                return `
                    <div class="review-item" style="border-left-color: #0f766e; display: flex; gap: 15px; align-items: center; justify-content: space-between;">
                        <div style="display: flex; gap: 15px; align-items: center;">
                            <img src="${studentPhoto}" 
                                onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(studentEmail)}'"
                                style="width:50px; height:50px; border-radius:50%; object-fit:cover; background:#f1f5f9;">
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <strong>${studentName}</strong>
                                    ${tags.join(' ')}
                                </div>
                                <span style="color:#666; font-size:0.85rem;">Email: ${studentEmail}</span>
                                <br>
                                <span style="color:#666; font-size:0.85rem;">Phone: ${student.phone || 'N/A'}</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            ${student.isVerified ? `
                                <button class="btn btn-primary btn-small" style="padding: 5px 10px; font-size: 0.75rem;" onclick="viewStudentDetails('${studentEmail}')">View Details</button>
                                <button class="btn btn-secondary btn-small" style="padding: 5px 10px; font-size: 0.75rem;" onclick="deleteStudent('${studentEmail}')">Remove</button>
                            ` : `
                                <button class="btn btn-primary btn-small" style="padding: 5px 10px; font-size: 0.75rem;" onclick="quickVerify('${studentEmail}', '${student.phone || ''}', '${student.photo_url || ''}')">Verify Now</button>
                            `}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            // Option 1: Hide section
            section.style.display = 'none';
            // Or Option 2 (backup if we wanted it always visible but helpful):
            // section.style.display = 'block';
            // container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Students will appear here after verification or joining.</p>';
        }
    } catch (error) {
        console.error('Error loading students:', error);
        section.style.display = 'block';
        container.innerHTML = `<p>Error loading students. Please try again.</p>`;
    }
}

async function viewStudentDetails(email) {
    if (!ownerMess) return;
    try {
        const response = await fetch(`${API_BASE_URL}/messes/${ownerMess._id}/students/${email}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        if (data.success) {
            const student = data.data;
            document.getElementById('modalStudentPhoto').src = student.photo_url;
            document.getElementById('modalStudentName').textContent = student.registeredName;
            document.getElementById('modalStudentEmail').textContent = student.email;
            document.getElementById('modalStudentPhone').textContent = student.phone;
            document.getElementById('modalHostelName').textContent = student.hostelName;
            document.getElementById('modalDateVerified').textContent = new Date(student.dateVerified).toLocaleString();
            
            const modal = document.getElementById('studentDetailsModal');
            modal.style.display = 'flex';
        } else {
            alert(data.message || 'Error fetching student details.');
        }
    } catch (error) {
        console.error('Error fetching student details:', error);
        alert('System error fetching student details.');
    }
}

function closeStudentModal() {
    const modal = document.getElementById('studentDetailsModal');
    modal.style.display = 'none';
}

async function deleteStudent(email) {
    if (!ownerMess) return;
    if (!confirm(`Are you sure you want to delete student ${email}? This will remove their verified status and they will no longer be able to review your hostel.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/messes/${ownerMess._id}/students/${email}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        if (data.success) {
            alert('Student removed successfully.');
            await loadYourStudents();
            await loadOwnerData(); // Refresh to update joined list
        } else {
            alert(data.message || 'Error deleting student.');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        alert('System error deleting student.');
    }
}



async function quickVerify(email, phone, photoUrl) {
    if (!confirm(`Do you want to quickly verify and authorize ${email} to leave reviews?`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}/messes/${ownerMess._id}/students`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                student_email: email,
                phone: phone || 'N/A',
                photo_url: photoUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(email)
            })
        });

        const data = await response.json();
        if (data.success) {
            alert('Student authorized successfully!');
            await loadYourStudents();
        } else {
            alert(data.message || 'Failed to authorize student.');
        }
    } catch (error) {
        alert('System error.');
    }
}

async function loadPendingReviews() {
    if (!ownerMess) return;
    try {
        const response = await fetch(`${API_BASE_URL}/messes/${ownerMess._id}/reviews/pending`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        const container = document.getElementById('pendingReviewsContainer');
        
        if (data.success && data.data && data.data.length > 0) {
            container.innerHTML = data.data.map(review => `
                <div class="review-item" style="border-left-color: orange;">
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <img src="${review.userId?.photo_url || 'images/default-avatar.png'}" style="width:50px; height:50px; border-radius:50%; object-fit:cover;">
                        <div>
                            <strong>${review.userId?.name || 'Unknown Student'}</strong> 
                            <span style="color:#666; font-size:0.85rem;">(${review.userId?.email || 'N/A'})</span>
                            <br>
                            <span style="font-size: 0.85rem; color: #10b981; font-weight: bold;">[AI Identity Verified]</span>
                        </div>
                    </div>
                    <p style="margin-top: 10px; font-size: 0.85rem; color: #666; font-style: italic;">
                        "Review content and ratings are hidden for privacy until you approve this student."
                    </p>
                    <div style="margin-top: 15px; display: flex; gap: 10px;">
                        <button class="btn btn-primary" onclick="approveReview('${review._id}', 'approved')">Approve Review</button>
                        <button class="btn btn-secondary" onclick="approveReview('${review._id}', 'rejected')">Reject Review</button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `<div class="no-content"><p>No pending reviews to approve.</p></div>`;
        }
    } catch (error) {
        document.getElementById('pendingReviewsContainer').innerHTML = `<p>Error loading pending reviews.</p>`;
    }
}

async function approveReview(reviewId, status) {
    if (!confirm(`Are you sure you want to mark this review as ${status}?`)) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/reviews/owner/${reviewId}/status`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status })
        });
        const data = await response.json();
        
        if (data.success) {
            alert(`Review ${status} successfully.`);
            loadPendingReviews();
        } else {
            alert(data.message || 'Error processing request.');
        }
    } catch (error) {
        alert('System error occurred processing review.');
    }
}


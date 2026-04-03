// ===================================
// MESS DETAILS & REVIEWS
// ===================================

let currentMessId = null;
let currentUserReview = null;
let currentOwnerDetails = null;

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
    }
}

function setWidth(id, width) {
    const el = document.getElementById(id);
    if (el) {
        el.style.width = width;
    }
}

function renderStarText(rating) {
    const safeRating = Number(rating || 0);
    return `Rating: ${safeRating.toFixed(1)}/5`;
}

function showDetailsError(message) {
    const title = document.getElementById('messName');
    if (title) {
        title.textContent = message;
    }
    setText('heroMessName', message);
    setText('heroMessMeta', 'Please go back and select a valid mess.');
}

document.addEventListener('DOMContentLoaded', async () => {
    // Get mess ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentMessId = urlParams.get('id');

    if (!currentMessId) {
        window.location.href = 'messes.html';
        return;
    }

    await loadMessDetails();
    await loadReviews();
    setupJoinButton();
});

function getBrowseMode() {
    return localStorage.getItem('browseMode');
}

async function loadMessDetails() {
    try {
        const response = await fetch(`${API_BASE_URL}/messes/${currentMessId}`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            const mess = data.data;

            if (!mess) {
                showDetailsError('Mess details unavailable');
                return;
            }

            setText('messName', mess.name || 'Unnamed Mess');
            setText('messLocation', mess.location || 'Unknown');
            setText('messPrice', mess.monthlyPrice || 'N/A');
            setText('messFoodType', mess.foodType || 'N/A');
            setText('messDescription', mess.description || 'No description available');
            setText('messPhone', mess.phoneNumber || 'N/A');

            const websiteCell = document.getElementById('messWebsite');
            if (websiteCell) {
                if (mess.website) {
                    websiteCell.innerHTML = `<a href="${mess.website}" target="_blank" rel="noopener noreferrer">${mess.website}</a>`;
                } else {
                    websiteCell.textContent = 'N/A';
                }
            }

            setText('heroMessName', mess.name || 'Mess Details');
            setText('heroMessMeta', `${mess.location || 'Unknown location'} • ${mess.foodType || 'Food type unavailable'} • ₹${mess.monthlyPrice || 'N/A'}/month`);
            // Update page banner title
            const bannerTitle = document.getElementById('bannerMessName');
            if (bannerTitle) bannerTitle.textContent = mess.name || 'Mess Details';

            const schedule = mess.foodSchedule || {};
            const breakfast = schedule.breakfast || {};
            const lunch = schedule.lunch || {};
            const dinner = schedule.dinner || {};
            const snacks = schedule.snacks || {};

            setText('scheduleBreakfastAvailable', breakfast.available ? 'Yes' : 'No');
            setText('scheduleBreakfastTime', breakfast.time || '-');
            setText('scheduleBreakfastDesc', breakfast.description || '-');

            setText('scheduleLunchAvailable', lunch.available ? 'Yes' : 'No');
            setText('scheduleLunchTime', lunch.time || '-');
            setText('scheduleLunchDesc', lunch.description || '-');

            setText('scheduleDinnerAvailable', dinner.available ? 'Yes' : 'No');
            setText('scheduleDinnerTime', dinner.time || '-');
            setText('scheduleDinnerDesc', dinner.description || '-');

            setText('scheduleSnacksAvailable', snacks.available ? 'Yes' : 'No');
            setText('scheduleSnacksTime', snacks.time || '-');
            setText('scheduleSnacksDesc', snacks.description || '-');

            const overallRating = Number(mess.overallRating || 0);
            const reviewCount = Number(mess.totalReviews || 0);

            // Update ratings
            setText('messRating', renderStarText(overallRating));
            setText('reviewCount', `${reviewCount} reviews`);
            setText('overallRatingNum', overallRating.toFixed(1));
            setText('heroOverallRating', overallRating.toFixed(1));
            setText('heroReviewCount', `${reviewCount} reviews`);

            // Update rating bars
            const foodRating = Number(mess.foodQualityRating || 0);
            const hygieneRating = Number(mess.hygieneRating || 0);
            setWidth('foodQualityBar', `${(foodRating / 5) * 100}%`);
            setWidth('hygieneBar', `${(hygieneRating / 5) * 100}%`);
            setText('foodQualityRating', `${foodRating.toFixed(1)}/5`);
            setText('hygieneRating', `${hygieneRating.toFixed(1)}/5`);

            if (typeof window.refreshRevealElements === 'function') {
                window.refreshRevealElements();
            }
        } else {
            showDetailsError('Unable to load this mess right now');
        }
    } catch (error) {
        console.error('Error loading mess details:', error);
        showDetailsError('Failed to load mess details');
    }
}

async function loadReviews() {
    try {
        const response = await fetch(`${API_BASE_URL}/reviews/mess/${currentMessId}`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            const reviews = data.data || [];

            const container = document.getElementById('reviewsContainer');
            const noReviews = document.getElementById('noReviewsMessage');

            if (!container || !noReviews) return;

            if (reviews.length === 0) {
                container.innerHTML = '';
                noReviews.innerHTML = '<p>Be the first to review this hostel!</p>';
                noReviews.style.display = 'block';
            } else {
                noReviews.style.display = 'none';
                container.innerHTML = reviews.map(review => createReviewHTML(review)).join('');
            }
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

function createReviewHTML(review) {
    const quantity = review.quantity ? `<span class="review-quantity">Qty: ${review.quantity.charAt(0).toUpperCase() + review.quantity.slice(1)}</span>` : '';
    const foodImage = review.foodImage ? `<img src="${review.foodImage}" alt="Food" class="review-food-image" style="max-width: 300px; max-height: 300px; border-radius: 8px; margin-top: 10px;">` : '';
    const voiceNote = review.voiceNote ? `
        <audio controls src="${review.voiceNote}" style="width: 100%; margin-top: 10px;"></audio>
    ` : '';
    
    // Mask email: student@example.com -> s******@example.com
    const maskEmail = (email) => {
        if (!email) return '';
        const [user, domain] = email.split('@');
        return user.charAt(0) + '*'.repeat(user.length - 1) + '@' + domain;
    };

    const userPhoto = review.userId.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(review.userId.name)}`;

    const categoryRatings = `
        <div class="review-subratings" style="margin: 10px 0; color: #5b6470; font-size: 0.92rem; line-height: 1.55;">
            <div>Staff Behavior: <strong>${review.staffBehaviorRating || '-'}/5</strong></div>
            <div>Value for Money: <strong>${review.valueForMoneyRating || '-'}/5</strong></div>
            <div>Dining Area Cleanliness: <strong>${review.diningAreaCleanlinessRating || '-'}/5</strong></div>
            <div>Timeliness: <strong>${review.timelinessRating || '-'}/5</strong></div>
        </div>
    `;
    
    return `
        <div class="review-item">
            <div class="review-header" style="display: flex; align-items: center; gap: 15px;">
                <img src="${userPhoto}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="review-user" style="font-weight: 700;">${review.userId.name}</span>
                        <span class="verified-badge" style="background: #10b981; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem;">Verified Student</span>
                    </div>
                    <div style="font-size: 0.8rem; color: #666;">${maskEmail(review.userId.email)}</div>
                </div>
                <span class="review-date">${new Date(review.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="review-rating" style="margin-top: 10px;">Rating: ${review.rating}/5 ${quantity}</div>
            ${categoryRatings}
            <div class="review-text">${review.review}</div>
            ${foodImage}
            ${voiceNote}
            ${isAuthenticated() && review.userId._id === JSON.parse(localStorage.getItem('user') || '{}').id ? `
                <div class="review-actions">
                    <button class="review-btn" onclick="editReview('${review._id}')">Edit</button>
                    <button class="review-btn delete" onclick="deleteReview('${review._id}')">Delete</button>
                </div>
            ` : ''}
        </div>
    `;
}

// Join mess functionality removed from here if it was redundant, but I'll keep it as requested for the flow.

async function setupJoinButton() {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const joinContainer = document.getElementById('joinMessContainer');
    const joinButton = document.getElementById('joinButton');
    const leaveButton = document.getElementById('leaveButton');
    const ownerDetailsCard = document.getElementById('ownerDetailsCard');

    // Only show join button for authenticated students
    if (token && userType === 'student') {
        joinContainer.style.display = 'block';

        // Check if student is already part of this mess
        if (user.joinedMessId === currentMessId) {
            joinButton.style.display = 'none';
            leaveButton.style.display = 'block';
            ownerDetailsCard.style.display = 'block';
            leaveButton.addEventListener('click', leaveMess);
            await loadAndDisplayOwnerDetails();
        } else if (user.joinedMessId) {
            // Student is already enrolled in ANOTHER hostel
            joinButton.style.display = 'block';
            joinButton.disabled = true;
            joinButton.textContent = 'Already Enrolled in a Hostel';
            joinButton.style.backgroundColor = '#ccc';
            joinButton.style.cursor = 'not-allowed';
            
            const msg = document.createElement('p');
            msg.textContent = "You are already enrolled in a hostel. Leave your current hostel to join this one.";
            msg.style.color = 'red';
            msg.style.fontSize = '0.85rem';
            msg.style.marginTop = '10px';
            joinContainer.appendChild(msg);
            
            leaveButton.style.display = 'none';
            ownerDetailsCard.style.display = 'none';
        } else {
            joinButton.style.display = 'block';
            leaveButton.style.display = 'none';
            ownerDetailsCard.style.display = 'none';
            joinButton.addEventListener('click', joinMessDirect);
        }
    } else {
        joinContainer.style.display = 'none';
        ownerDetailsCard.style.display = 'none';
    }
}

async function loadAndDisplayOwnerDetails() {
    try {
        const response = await fetch(`${API_BASE_URL}/messes/${currentMessId}`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            const mess = data.data;
            
            if (mess.ownerId) {
                const owner = mess.ownerId;
                document.getElementById('ownerNameDisplay').textContent = owner.name || '-';
                document.getElementById('ownerEmailDisplay').textContent = owner.email || '-';
                document.getElementById('ownerPhoneDisplay').textContent = owner.phone || '-';
                document.getElementById('messNameDisplay').textContent = mess.name || '-';
            }
        }
    } catch (error) {
        console.error('Error loading owner details:', error);
    }
}

async function joinMessDirect() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/messes/${currentMessId}/join`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message || 'Successfully joined!');
            // Update local user data
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            window.location.href = 'browse.html';
        } else {
            alert(data.message || 'Failed to join mess');
        }
    } catch (error) {
        console.error('Error joining mess:', error);
        alert('Error connecting to server');
    }
}

function cancelJoin() {
    document.getElementById('joinConfirmationModal').style.display = 'none';
}

async function confirmJoinNow() {
    if (!currentOwnerDetails) return;

    try {
        // Show loading state
        const confirmBtn = document.getElementById('confirmJoinButton');
        const originalText = confirmBtn.textContent;
        confirmBtn.textContent = 'Joining...';
        confirmBtn.disabled = true;

        const token = localStorage.getItem('token');
        const user = await getCurrentUser();
        const response = await fetch(`${API_BASE_URL}/students/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                messId: currentMessId,
                studentId: user._id
            })
        });

        const data = await response.json();

        if (data.success) {
            // Update local user data
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.joinedMessId = currentMessId;
            localStorage.setItem('user', JSON.stringify(user));

            // Close modal
            document.getElementById('joinConfirmationModal').style.display = 'none';

            // Show success alert
            alert(`Successfully joined ${currentOwnerDetails.messName}!\n\nOwner Contact:\nPhone: ${currentOwnerDetails.ownerPhone}\nEmail: ${currentOwnerDetails.ownerEmail}`);
            
            // Show owner details card
            document.getElementById('ownerDetailsCard').style.display = 'block';
            document.getElementById('joinButton').style.display = 'none';
            document.getElementById('leaveButton').style.display = 'block';
            
            // Display owner details
            document.getElementById('ownerNameDisplay').textContent = currentOwnerDetails.ownerName;
            document.getElementById('ownerEmailDisplay').textContent = currentOwnerDetails.ownerEmail;
            document.getElementById('ownerPhoneDisplay').textContent = currentOwnerDetails.ownerPhone;
            document.getElementById('messNameDisplay').textContent = currentOwnerDetails.messName;

            // Add leave event listener
            document.getElementById('leaveButton').addEventListener('click', leaveMess);
            
            // Restore button state
            confirmBtn.textContent = originalText;
            confirmBtn.disabled = false;
        } else {
            alert('Error: ' + (data.message || 'Could not join mess'));
            confirmBtn.textContent = originalText;
            confirmBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error joining mess:', error);
        alert('Error joining mess. Please try again.');
        
        // Restore button state
        const confirmBtn = document.getElementById('confirmJoinButton');
        confirmBtn.textContent = 'Confirm';
        confirmBtn.disabled = false;
    }
}

async function leaveMess() {
    if (!confirm('Are you sure you want to leave this mess? You can join again anytime.')) {
        return;
    }

    try {
        // Show loading state
        const leaveBtn = document.getElementById('leaveButton');
        const originalText = leaveBtn.textContent;
        leaveBtn.textContent = 'Leaving...';
        leaveBtn.disabled = true;

        const response = await fetch(`${API_BASE_URL}/students/leave`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            // Update local user data
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.joinedMessId = null;
            localStorage.setItem('user', JSON.stringify(user));

            // Show success message
            alert('You have left the mess');
            
            // Hide owner details and show join button
            document.getElementById('ownerDetailsCard').style.display = 'none';
            document.getElementById('leaveButton').style.display = 'none';
            document.getElementById('joinButton').style.display = 'block';
            
            // Restore button state
            leaveBtn.textContent = originalText;
            leaveBtn.disabled = false;
        } else {
            alert('Error: ' + (data.message || 'Could not leave mess'));
            leaveBtn.textContent = originalText;
            leaveBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error leaving mess:', error);
        alert('Error leaving mess. Please try again.');
        
        // Restore button state
        const leaveBtn = document.getElementById('leaveButton');
        leaveBtn.textContent = 'Leave Mess';
        leaveBtn.disabled = false;
    }
}
// ===================================
// DASHBOARD
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    protectRoute(); // Ensure user is logged in
    await loadUserProfile();
    switchTab(); // Initialize tab based on URL param or default
});

async function loadUserProfile() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Store user in localStorage to keep it updated
        localStorage.setItem('user', JSON.stringify(user));

        // Update sidebar
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userEmail').textContent = user.email;

        // Setup sidebar avatar (initials or photo)
        const avatarDiv = document.getElementById('sidebarAvatar');
        if (avatarDiv) {
            if (user.photo_url) {
                avatarDiv.innerHTML = `<img src="${user.photo_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                avatarDiv.textContent = initials || 'UN';
            }
        }

        // Update Start Tab Status Section
        const statusSection = document.getElementById('statusSection');
        if (statusSection) {
            if (user.joinedMessId && user.isVerified) {
                statusSection.style.display = 'block';
                statusSection.style.borderLeftColor = '#10b981';
                document.getElementById('statusTitle').textContent = 'You are verified!';
                document.getElementById('statusText').textContent = 'You can now submit or edit a review for your hostel.';
                document.getElementById('statusAction').style.display = 'block';
            } else if (user.joinedMessId && !user.isVerified) {
                statusSection.style.display = 'block';
                statusSection.style.borderLeftColor = '#f59e0b';
                document.getElementById('statusTitle').textContent = 'Verification Pending';
                document.getElementById('statusText').textContent = 'The hostel owner needs to verify your identity before you can give a review.';
                document.getElementById('statusAction').style.display = 'none';
            } else {
                statusSection.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// ===================================
// TAB SWITCHING & REVIEWS
// ===================================

function switchTab(tabId) {
    if (typeof tabId !== 'string') {
        const urlParams = new URLSearchParams(window.location.search);
        tabId = urlParams.get('tab') || 'startTab';
    }

    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    // Show the selected tab
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.style.display = 'block';
    }

    // Update menu active state
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        // Handle both link clicks and manual calls
        if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(tabId)) {
            item.classList.add('active');
        }
        if (item.getAttribute('href') && item.getAttribute('href').includes('dashboard.html') && tabId === 'startTab') {
            item.classList.add('active');
        }
    });

    // If reviews tab, load reviews
    if (tabId === 'reviewsTab') {
        loadMyReviews();
    }
}

async function loadMyReviews() {
    const reviewsList = document.getElementById('myReviewsList');
    if (!reviewsList) return;

    try {
        const res = await fetch(`${API_BASE_URL}/reviews/user/my-reviews`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();

        if (data.success && data.data && data.data.length > 0) {
            reviewsList.innerHTML = data.data.map(review => `
                <div class="card" style="margin-bottom: 15px;">
                    <div class="card-body" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 20px;">
                        <div style="flex: 1;">
                            <h4 style="margin-bottom: 5px;">${review.messId.name}</h4>
                            <p style="font-size: 0.85rem; color: #666; margin-bottom: 8px;">
                                Rating: <span style="color: #ff9f1c; font-weight: 700;">${review.rating}/5</span> • ${new Date(review.createdAt).toLocaleDateString()}
                            </p>
                            <p style="color: #4b5563; line-height: 1.5;">${review.review}</p>
                            <div style="margin-top: 12px;">
                                <span class="status-badge" style="background: ${review.status === 'approved' ? '#dcfce7' : '#fef3c7'}; color: ${review.status === 'approved' ? '#166534' : '#92400e'}; border: 1px solid ${review.status === 'approved' ? '#bbf7d0' : '#fde68a'};">
                                    ${review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                                </span>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-left: 20px;">
                            <button class="btn btn-outline btn-small" onclick="window.location.href='review.html?id=${review.messId._id}'" style="white-space: nowrap; font-size: 0.75rem; padding: 6px 12px;">Edit</button>
                            <button class="btn btn-outline btn-small" onclick="deleteReview('${review._id}')" style="white-space: nowrap; font-size: 0.75rem; padding: 6px 12px; color: #ef4444; border-color: #ef4444;">Delete</button>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            reviewsList.innerHTML = `
                <div class="no-content">
                    <p>You haven't submitted any reviews yet.</p>
                    <a href="review.html" class="btn btn-primary" style="margin-top: 15px;">Write Your First Review</a>
                </div>
            `;
        }
    } catch (err) {
        reviewsList.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 20px;">Failed to load reviews. Please try again later.</p>';
    }
}

async function deleteReview(reviewId) {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
        const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await res.json();

        if (data.success) {
            if (typeof showNotification === 'function') {
                showNotification('Review deleted successfully!', 'success');
            } else {
                alert('Review deleted successfully!');
            }
            loadMyReviews();
        } else {
            const msg = data.message || 'Failed to delete review';
            if (typeof showNotification === 'function') {
                showNotification(msg, 'error');
            } else {
                alert(msg);
            }
        }
    } catch (err) {
        if (typeof showNotification === 'function') {
            showNotification('Error connecting to server', 'error');
        } else {
            alert('Error connecting to server');
        }
    }
}


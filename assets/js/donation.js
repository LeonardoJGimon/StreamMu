document.addEventListener('DOMContentLoaded', () => {
    handleDonationStatus();
});

async function handleDonationStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || urlParams.get('orderId');
    const action = urlParams.get('action');
    
    if (action === 'cancel' || window.location.pathname.includes('cancel')) {
        showView('view-cancel');
        return;
    }

    if (token) {
        showView('view-loading');
        const serverType = localStorage.getItem('lastDonationServer') || 'server1';

        try {
            await processPaymentCapture(token, serverType);
        } catch (error) {
            console.error("Payment Error:", error);
            showError("Network error. Could not contact the game server.", token);
        }

    } else {
        showError('Invalid donation status link (missing token).', null);
    }
}

async function processPaymentCapture(orderId, serverType) {
    try {
        const response = await fetch('/capture-paypal-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                orderId: orderId,
                serverType: serverType 
            })
        });

        const result = await response.json();

        if (response.ok && (result.success === true || result.status === 'completed' || result.status === 'already_processed')) {
            showView('view-success');
            localStorage.removeItem('lastDonationServer');
        } else {
            showError(result.message || 'Payment capture failed or was declined.', orderId);
        }

    } catch (err) {
        throw err;
    }
}

function showView(viewId) {
    const views = ['view-loading', 'view-success', 'view-error', 'view-cancel'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden');
            el.setAttribute('hidden', '');
        }
    });
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');
        target.removeAttribute('hidden');
    }
}

function showError(message, orderId) {
    showView('view-error');
    
    const msgEl = document.getElementById('error-text');
    if (msgEl) msgEl.innerText = message;

    if (orderId) {
        const detailsEl = document.getElementById('error-details');
        if (detailsEl) detailsEl.classList.remove('hidden');
        const orderEl = document.getElementById('display-order-id');
        if (orderEl) orderEl.innerText = orderId;
    }
}
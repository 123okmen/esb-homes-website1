Window.onload = function() {
    // Collapsible content for Influencing Factors
    document.querySelectorAll('#factors-container button').forEach(button => {
        button.addEventListener('click', function() {
            const content = this.nextElementSibling.querySelector('.collapsible-content'); // Select the actual collapsible content div
            const icon = this.querySelector('span:last-child');
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                icon.style.transform = 'rotate(0deg)';
            } else {
                // Close other open items
                document.querySelectorAll('#factors-container .collapsible-content').forEach(item => {
                    item.style.maxHeight = null;
                    item.closest('.content-card').querySelector('button span:last-child').style.transform = 'rotate(0deg)'; // Adjust to find the correct button's icon
                });
                content.style.maxHeight = content.scrollHeight + "px";
                icon.style.transform = 'rotate(45deg)';
            }
        });
    });

    // Cost Estimation Logic
    const estimatorForm = document.getElementById('estimatorForm');
    const areaInput = document.getElementById('area');
    const floorsInput = document.getElementById('floors');
    const styleSelect = document.getElementById('style');
    const finishSelect = document.getElementById('finish');
    const foundationTypeSelect = document.getElementById('foundation_type');
    const mezzanineOptionSelect = document.getElementById('mezzanine_option');
    const rooftopOptionSelect = document.getElementById('rooftop_option');
    const roofTypeSelect = document.getElementById('roof_type');
    const emailInput = document.getElementById('email');

    const resultsSection = document.getElementById('resultsSection');
    const estimatedCostDisplay = document.getElementById('estimatedCost');
    const costLoadingSpinner = document.getElementById('costLoadingSpinner');
    const costError = document.getElementById('costError');
    const emailNotification = document.getElementById('emailNotification');
    const detailedBreakdownTableBody = document.getElementById('detailedBreakdownTableBody');
    const paymentScheduleTableBody = document.getElementById('paymentScheduleTableBody');
    const sendEmailBtn = document.getElementById('sendEmailBtn');
    const ctxCostBreakdown = document.getElementById('

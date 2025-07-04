// script.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Dynamic Navigation Generation
    const sections = document.querySelectorAll('main section[id]');
    const sideNavList = document.getElementById('side-nav-list');
    const floatingNavList = document.getElementById('floating-nav-list');

    sections.forEach(section => {
        const id = section.id;
        const titleElement = section.querySelector('h2');
        if (titleElement) {
            const title = titleElement.textContent;

            // Side Menu
            const listItemSide = document.createElement('li');
            const anchorSide = document.createElement('a');
            anchorSide.href = `#${id}`;
            anchorSide.textContent = title;
            anchorSide.className = 'block py-2 px-4 rounded-md text-[#E0E7FF] hover:bg-[#FBBF24] hover:text-[#1F2937] transition-colors duration-200 text-lg font-medium';
            listItemSide.appendChild(anchorSide);
            sideNavList.appendChild(listItemSide);

            // Floating TOC Menu (only for desktop, hidden on small screens)
            const listItemFloat = document.createElement('li');
            const anchorFloat = document.createElement('a');
            anchorFloat.href = `#${id}`;
            anchorFloat.textContent = title.replace('Chào mừng đến với Công cụ Ước tính Chi phí Xây dựng Nhà phố', 'Giới thiệu')
                                         .replace('Các Yếu tố Ảnh hưởng đến Chi phí Xây dựng', 'Yếu tố chi phí')
                                         .replace('Công cụ Ước tính Chi phí Xây dựng Trọn Gói', 'Ước tính Trọn Gói')
                                         .replace('Báo Giá Thiết Kế Kiến Trúc', 'Thiết kế KT')
                                         .replace('Báo Giá Xây Dựng Phần Thô', 'XD Phần Thô')
                                         .replace('Báo Giá Xây Dựng Phần Hoàn Thiện', 'XD Hoàn Thiện')
                                         .replace('Các Gói Xây dựng Trọn Gói Phổ biến', 'Các gói XD')
                                         .replace('Lưu ý Quan trọng', 'Lưu ý')
                                         .replace('Liên Hệ Với Chúng Tôi', 'Liên hệ'); // Shorten for floating menu
            anchorFloat.className = 'block py-1 px-2 rounded-md text-[#E0E7FF] hover:bg-[#FBBF24] hover:text-[#1F2937] transition-colors duration-200 text-sm';
            listItemFloat.appendChild(anchorFloat);
            floatingNavList.appendChild(listItemFloat);
        }
    });

    // Smooth scrolling for all internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            document.querySelector(targetId).scrollIntoView({
                behavior: 'smooth'
            });
            // Close side menu after clicking a link
            if (sideMenu.classList.contains('translate-x-0')) {
                sideMenu.classList.remove('translate-x-0');
                sideMenu.classList.add('translate-x-full');
                sideMenuOverlay.classList.add('hidden');
                sideMenuOverlay.classList.remove('opacity-50');
            }
        });
    });

    // Active link highlighting for floating TOC (Optional, more advanced)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.3 // Adjust as needed
    };

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const id = entry.target.getAttribute('id');
            const floatingLink = document.querySelector(`#floating-nav-list a[href="#${id}"]`);
            if (floatingLink) {
                if (entry.isIntersecting) {
                    floatingLink.classList.add('bg-[#FBBF24]', 'text-[#1F2937]');
                    floatingLink.classList.remove('text-[#E0E7FF]', 'hover:bg-[#FBBF24]', 'hover:text-[#1F2937]');
                } else {
                    floatingLink.classList.remove('bg-[#FBBF24]', 'text-[#1F2937]');
                    floatingLink.classList.add('text-[#E0E7FF]', 'hover:bg-[#FBBF24]', 'hover:text-[#1F2937]');
                }
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        sectionObserver.observe(section);
    });

    // 2. Hamburger Menu Functionality
    const hamburgerBtn = document.getElementById('hamburger-menu-button');
    const closeMenuBtn = document.getElementById('close-side-menu');
    const sideMenu = document.getElementById('side-menu');
    const sideMenuOverlay = document.getElementById('side-menu-overlay');

    hamburgerBtn.addEventListener('click', () => {
        sideMenu.classList.remove('translate-x-full');
        sideMenu.classList.add('translate-x-0');
        sideMenuOverlay.classList.remove('hidden');
        setTimeout(() => sideMenuOverlay.classList.add('opacity-50'), 10);
    });

    closeMenuBtn.addEventListener('click', () => {
        sideMenu.classList.remove('translate-x-0');
        sideMenu.classList.add('translate-x-full');
        sideMenuOverlay.classList.remove('opacity-50');
        setTimeout(() => sideMenuOverlay.classList.add('hidden'), 300);
    });

    sideMenuOverlay.addEventListener('click', () => {
        closeMenuBtn.click();
    });

    // 3. Collapsible Section Functionality
    document.querySelectorAll('#factors-container > .content-card button').forEach(button => {
        button.addEventListener('click', () => {
            const contentCard = button.closest('.content-card');
            const collapsibleContent = contentCard.querySelector('.collapsible-content');
            const icon = button.querySelector('span');

            if (collapsibleContent.style.maxHeight && collapsibleContent.style.maxHeight !== '0px') {
                collapsibleContent.style.maxHeight = null;
                collapsibleContent.style.paddingTop = '0';
                icon.textContent = '+';
                icon.classList.remove('rotate-45');
            } else {
                collapsibleContent.style.maxHeight = collapsibleContent.scrollHeight + 32 + 'px'; // Add extra space for padding
                collapsibleContent.style.paddingTop = '1rem';
                icon.textContent = '-';
                icon.classList.add('rotate-45');
            }
        });

        // Initialize all collapsible contents as closed
        const collapsibleContent = button.closest('.content-card').querySelector('.collapsible-content');
        collapsibleContent.style.maxHeight = '0';
        collapsibleContent.style.overflow = 'hidden';
        collapsibleContent.style.transition = 'max-height 0.3s ease-out, padding-top 0.3s ease-out';
        collapsibleContent.style.paddingTop = '0';
    });


    // 4. Cost Estimator Logic
    const estimatorForm = document.getElementById('estimatorForm');
    const areaInput = document.getElementById('area');
    const floorsInput = document.getElementById('floors');
    const styleSelect = document.getElementById('style');
    const finishSelect = document.getElementById('finish');
    const foundationSelect = document.getElementById('foundation_type');
    const mezzanineSelect = document.getElementById('mezzanine_option');
    const rooftopSelect = document.getElementById('rooftop_option');
    const roofTypeSelect = document.getElementById('roof_type');
    const emailInput = document.getElementById('email');
    const calculateBtn = document.getElementById('calculateBtn');
    const costLoadingSpinner = document.getElementById('costLoadingSpinner');
    const costError = document.getElementById('costError');
    const estimatedCostDisplay = document.getElementById('estimatedCost');
    const resultsSection = document.getElementById('resultsSection');
    const detailedBreakdownTableBody = document.getElementById('detailedBreakdownTableBody');
    const paymentScheduleTableBody = document.getElementById('paymentScheduleTableBody');
    const sendEmailBtn = document.getElementById('sendEmailBtn');
    const emailNotification = document.getElementById('emailNotification');

    let costChart; // To hold the Chart.js instance

    // Define base rates and factors (REALISTIC EXAMPLES - ADJUST THESE VALUES CAREFULLY)
    // These rates are per square meter of construction area
    const rates = {
        finish: {
            basic: 5200000,   // VNĐ/m² for basic finish
            standard: 6500000, // VNĐ/m² for standard finish
            premium: 8000000  // VNĐ/m² for premium finish
        },
        style: {
            modern: 1.0,      // Modern is base
            minimalist: 1.03, // Minimalist might require more precise finishing
            neoclassical: 1.15 // Neoclassical has complex details, higher cost
        },
        // Factors for areas that are not full floors but add cost (e.g., foundation, roof, mezzanine, rooftop)
        // These are coefficients applied to the *main floor area* or treated as separate area costs
        foundation_coefficient: { // % of ground floor area equivalent for foundation cost calculation
            simple: 0.3,  // 30% of ground floor area
            strip: 0.4,   // 40%
            pile: 0.55    // 55% for complex pile foundation
        },
        mezzanine_coefficient: 0.7, // 70% of its actual area cost (as it's partial structure)
        rooftop_coefficient: 0.5,   // 50% of its actual area cost (partially covered, finishing)
        roof_coefficient: { // % of roof coverage area equivalent for roof cost calculation
            flat: 0.3,    // Flat roof, basic finish: 30% of covered area
            thai: 0.45,   // Thai roof, complex structure: 45%
            japanese: 0.4  // Japanese roof: 40%
        },
        basement_coefficient: 1.5, // If you add basement, it's very expensive (150% of a floor area)
        // You might need a design cost per m2, or it's implicitly included in the total m2 rate
        design_rate_per_sqm: 150000 // VNĐ/m² for design, separate from construction
    };

    // Cost breakdown percentages (example, these should sum to 100 for the main construction)
    // These are for the construction itself, excluding separate design/foundation calculations
    const constructionBreakdownPercentages = {
        'Phần Thô (Vật tư & Nhân công)': 0.60,
        'Hoàn thiện (Vật tư & Nhân công)': 0.40,
    };

    // Define Payment Schedule
    const paymentSchedule = [
        { phase: 'Đợt 1', description: 'Tạm ứng thiết kế & Ký hợp đồng thi công (10% GT HĐ)', percentage: 0.10 },
        { phase: 'Đợt 2', description: 'Hoàn thành móng & sàn trệt (20% GT HĐ)', percentage: 0.20 },
        { phase: 'Đợt 3', description: 'Hoàn thành sàn lầu 1, lầu 2, ... mái (25% GT HĐ)', percentage: 0.25 },
        { phase: 'Đợt 4', description: 'Xây tường, đi điện nước âm, tô trát (20% GT HĐ)', percentage: 0.20 },
        { phase: 'Đợt 5', description: 'Ốp lát, sơn bả, lắp đặt thiết bị (15% GT HĐ)', percentage: 0.15 },
        { phase: 'Đợt 6', description: 'Bàn giao công trình, nghiệm thu, thanh lý (10% GT HĐ)', percentage: 0.10 }
    ];

    estimatorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        costError.classList.add('hidden');
        emailNotification.classList.add('hidden');
        resultsSection.classList.add('hidden');
        costLoadingSpinner.style.display = 'block';
        calculateBtn.disabled = true;

        const area = parseFloat(areaInput.value);
        const floors = parseInt(floorsInput.value);
        const style = styleSelect.value;
        const finish = finishSelect.value;
        const foundationType = foundationSelect.value;
        const mezzanineOption = mezzanineSelect.value;
        const rooftopOption = rooftopSelect.value;
        const roofType = roofTypeSelect.value;
        const email = emailInput.value;

        if (isNaN(area) || area < 20 || area > 500 || isNaN(floors) || floors < 1 || floors > 7 || !email || !email.includes('@')) {
            costError.textContent = 'Vui lòng nhập đầy đủ và chính xác thông tin diện tích (20-500m²), số tầng (1-7) và email hợp lệ.';
            costError.classList.remove('hidden');
            costLoadingSpinner.style.display = 'none';
            calculateBtn.disabled = false;
            return;
        }

        // --- Core Calculation Logic ---
        let totalEstimatedCost = 0;
        let effectiveConstructionArea = 0; // Diện tích xây dựng thực tế tính tiền
        let baseCostPerSqm = rates.finish[finish]; // Đơn giá vật tư hoàn thiện/m2

        // Ground floor + Upper floors
        effectiveConstructionArea += area * floors;

        // Foundation cost (calculated as a percentage of ground floor area cost)
        const foundationAreaEquivalent = area * rates.foundation_coefficient[foundationType];
        const foundationCost = foundationAreaEquivalent * baseCostPerSqm;
        effectiveConstructionArea += foundationAreaEquivalent; // Add to effective area for total calculation

        // Mezzanine cost (if applicable)
        if (mezzanineOption === 'yes') {
            // Assume mezzanine area is typically 50-70% of a floor, for simplicity let's use 0.5 * area
            const mezzanineActualArea = area * 0.5; // Example: Mezzanine is half the ground floor area
            const mezzanineCost = mezzanineActualArea * baseCostPerSqm * rates.mezzanine_coefficient;
            effectiveConstructionArea += mezzanineActualArea * rates.mezzanine_coefficient; // Add weighted area
        }

        // Rooftop cost (if applicable)
        if (rooftopOption === 'yes') {
            // Assume rooftop area is typically 50% of area for calculation
            const rooftopActualArea = area * 0.5;
            const rooftopCost = rooftopActualArea * baseCostPerSqm * rates.rooftop_coefficient;
            effectiveConstructionArea += rooftopActualArea * rates.rooftop_coefficient; // Add weighted area
        }

        // Roof cost (applied to the main area it covers)
        const roofAreaEquivalent = area * rates.roof_coefficient[roofType];
        const roofCost = roofAreaEquivalent * baseCostPerSqm;
        effectiveConstructionArea += roofAreaEquivalent; // Add to effective area

        // Total Construction Cost (includes foundation, floors, roof, mezzanine, rooftop)
        let totalConstructionBase = effectiveConstructionArea * baseCostPerSqm;

        // Apply style factor to the main construction part
        totalConstructionBase *= rates.style[style];

        // Add design cost separately (usually based on actual floor area, not effective area with coefficients)
        const designCost = area * floors * rates.design_rate_per_sqm;

        // Final total estimated cost
        totalEstimatedCost = totalConstructionBase + designCost;

        // Simulate API call or complex calculation
        setTimeout(() => {
            estimatedCostDisplay.textContent = `${totalEstimatedCost.toLocaleString('vi-VN')} VNĐ`;
            resultsSection.classList.remove('hidden');

            // --- Update Chart ---
            const chartLabels = ['Phần Thô & Hoàn thiện', 'Móng', 'Mái', 'Thiết kế & Giám sát', 'Chi phí khác (dự phòng)'];
            const chartValues = [];

            // Proportion of main construction (excluding design, specific foundation/roof calc)
            const mainConstructionCost = totalConstructionBase - foundationCost - roofCost;
            chartValues.push(mainConstructionCost);
            chartValues.push(foundationCost);
            chartValues.push(roofCost);
            chartValues.push(designCost);
            
            // Add a contingency fund (e.g., 5% of total cost)
            const contingencyCost = totalEstimatedCost * 0.05; // 5% buffer
            chartValues.push(contingencyCost);
            totalEstimatedCost += contingencyCost; // Add to total for display

            estimatedCostDisplay.textContent = `${totalEstimatedCost.toLocaleString('vi-VN')} VNĐ`; // Update total with contingency


            if (costChart) {
                costChart.destroy();
            }
            const ctx = document.getElementById('costBreakdownChart').getContext('2d');
            costChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        data: chartValues,
                        backgroundColor: [
                            'rgba(251, 191, 36, 0.8)', // Main Construction
                            'rgba(217, 119, 6, 0.8)',  // Foundation
                            'rgba(31, 41, 55, 0.8)',   // Roof
                            'rgba(100, 116, 139, 0.8)', // Design
                            'rgba(59, 130, 246, 0.8)' // Contingency
                        ],
                        borderColor: [
                            'rgba(251, 191, 36, 1)',
                            'rgba(217, 119, 6, 1)',
                            'rgba(31, 41, 55, 1)',
                            'rgba(100, 116, 139, 1)',
                            'rgba(59, 130, 246, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: '#1F2937'
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        label += context.parsed.toLocaleString('vi-VN') + ' VNĐ';
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });

            // --- Update Detailed Breakdown Table ---
            detailedBreakdownTableBody.innerHTML = '';
            const detailedItems = [
                { main: 'Chi phí thi công', detail: 'Phần thô (kết cấu, tường, sàn)', cost: mainConstructionCost * constructionBreakdownPercentages['Phần Thô (Vật tư & Nhân công)'] },
                { main: 'Chi phí thi công', detail: 'Phần hoàn thiện (ốp lát, sơn, cửa, thiết bị vệ sinh)', cost: mainConstructionCost * constructionBreakdownPercentages['Hoàn thiện (Vật tư & Nhân công)'] },
                { main: 'Chi phí thi công', detail: `Móng (${foundationType === 'simple' ? 'Đơn' : foundationType === 'strip' ? 'Băng' : 'Cọc'})`, cost: foundationCost },
                { main: 'Chi phí thi công', detail: `Mái (${roofType === 'flat' ? 'Bằng' : roofType === 'thai' ? 'Thái' : 'Nhật'})`, cost: roofCost },
            ];

            if (mezzanineOption === 'yes') {
                detailedItems.splice(2, 0, { main: 'Chi phí thi công', detail: 'Tầng lửng', cost: area * 0.5 * baseCostPerSqm * rates.mezzanine_coefficient });
            }
            if (rooftopOption === 'yes') {
                detailedItems.splice(detailedItems.length - 1, 0, { main: 'Chi phí thi công', detail: 'Sân thượng', cost: area * 0.5 * baseCostPerSqm * rates.rooftop_coefficient });
            }

            detailedItems.push(
                { main: 'Chi phí khác', detail: 'Thiết kế kiến trúc và Giám sát', cost: designCost },
                { main: 'Chi phí khác', detail: 'Chi phí dự phòng (5%)', cost: contingencyCost },
                { main: 'Tổng chi phí ước tính', detail: '', cost: totalEstimatedCost }
            );

            detailedItems.forEach(item => {
                const row = detailedBreakdownTableBody.insertRow();
                row.className = 'border-b border-gray-200';
                row.innerHTML = `
                    <td class="px-4 py-2">${item.main}</td>
                    <td class="px-4 py-2">${item.detail}</td>
                    <td class="px-4 py-2 text-right">${item.cost.toLocaleString('vi-VN')} VNĐ</td>
                `;
                 if (item.main.includes('Tổng chi phí ước tính')) {
                    row.classList.add('font-bold', 'bg-gray-100', 'text-[#D97706]');
                }
            });

            // --- Update Payment Schedule Table ---
            paymentScheduleTableBody.innerHTML = '';
            paymentSchedule.forEach(item => {
                const row = paymentScheduleTableBody.insertRow();
                row.className = 'border-b border-gray-200';
                row.innerHTML = `
                    <td class="px-4 py-2">${item.phase}</td>
                    <td class="px-4 py-2">${item.description}</td>
                    <td class="px-4 py-2 text-right">${(item.percentage * 100).toFixed(0)}%</td>
                    <td class="px-4 py-2 text-right">${(totalEstimatedCost * item.percentage).toLocaleString('vi-VN')} VNĐ</td>
                `;
            });

            costLoadingSpinner.style.display = 'none';
            calculateBtn.disabled = false;
            sendEmailBtn.disabled = false; // Enable send email button after calculation
        }, 1000); // Simulate 1 second calculation
    });

    // 5. Email Sending Functionality (Requires a Backend)
    sendEmailBtn.addEventListener('click', () => {
        const email = emailInput.value;

        if (!email || !email.includes('@')) {
            emailNotification.textContent = 'Vui lòng nhập email hợp lệ để gửi báo giá.';
            emailNotification.classList.remove('hidden', 'bg-green-100', 'border-green-400', 'text-green-800');
            emailNotification.classList.add('bg-red-100', 'border-red-400', 'text-red-800');
            return;
        }

        // Gather all details from the form and calculated results
        const quoteDetails = {
            area: areaInput.value,
            floors: floorsInput.value,
            style: styleSelect.value,
            finish: finishSelect.value,
            foundationType: foundationSelect.value,
            mezzanineOption: mezzanineSelect.value,
            rooftopOption: rooftopSelect.value,
            roofType: roofTypeSelect.value,
            clientEmail: email,
            estimatedCost: estimatedCostDisplay.textContent,
            detailedBreakdown: [], // You'd loop through detailedItems to build this
            paymentSchedule: []    // You'd loop through paymentSchedule to build this
        };

        // Populate detailed breakdown for email
        document.querySelectorAll('#detailedBreakdownTableBody tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length === 3) {
                quoteDetails.detailedBreakdown.push({
                    main: cells[0].textContent,
                    detail: cells[1].textContent,
                    cost: cells[2].textContent
                });
            }
        });

        // Populate payment schedule for email
        document.querySelectorAll('#paymentScheduleTableBody tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length === 4) {
                quoteDetails.paymentSchedule.push({
                    phase: cells[0].textContent,
                    description: cells[1].textContent,
                    percentage: cells[2].textContent,
                    payment: cells[3].textContent
                });
            }
        });


        sendEmailBtn.disabled = true;
        costLoadingSpinner.style.display = 'block';

        // *** IMPORTANT: This fetch request requires a backend server to handle the email sending. ***
        // Example endpoint: '/api/send-quote'
        // On your server, you would use a library like Nodemailer (Node.js) or smtplib (Python)
        // to send an email using an actual email service (e.g., SendGrid, Mailgun, or your own SMTP).
        fetch('/api/send-quote', { // REPLACE with your actual backend API endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(quoteDetails),
        })
        .then(response => {
            if (!response.ok) {
                // If the server responded with an error, try to read the error message
                return response.json().then(err => { throw new Error(err.message || 'Lỗi không xác định từ server.'); });
            }
            return response.json();
        })
        .then(data => {
            emailNotification.textContent = 'Yêu cầu báo giá đã được gửi đến email của bạn! Vui lòng kiểm tra hộp thư đến hoặc thư mục spam.';
            emailNotification.classList.remove('hidden', 'bg-red-100', 'border-red-400', 'text-red-800');
            emailNotification.classList.add('bg-green-100', 'border-green-400', 'text-green-800');
            setTimeout(() => emailNotification.classList.add('hidden'), 8000); // Keep message longer
        })
        .catch((error) => {
            console.error('Error sending email:', error);
            emailNotification.textContent = `Đã xảy ra lỗi khi gửi yêu cầu báo giá: ${error.message}. Vui lòng thử lại sau hoặc liên hệ trực tiếp.`;
            emailNotification.classList.remove('hidden', 'bg-green-100', 'border-green-400', 'text-green-800');
            emailNotification.classList.add('bg-red-100', 'border-red-400', 'text-red-800');
        })
        .finally(() => {
            costLoadingSpinner.style.display = 'none';
            sendEmailBtn.disabled = false;
        });
    });

});

document.addEventListener('DOMContentLoaded', function () {
    // --- KHAI BÁO BIẾN --- //
    const form = document.getElementById('estimatorForm');
    const calculateBtn = document.getElementById('calculateBtn');
    const estimatedCostEl = document.getElementById('estimatedCost');
    const resultsSection = document.getElementById('resultsSection');
    const costErrorEl = document.getElementById('costError');
    const emailNotificationEl = document.getElementById('emailNotification');
    const sendEmailBtn = document.getElementById('sendEmailBtn');
    
    const detailedBreakdownTableBody = document.getElementById('detailedBreakdownTableBody');
    const paymentScheduleTableBody = document.getElementById('paymentScheduleTableBody');

    const sections = document.querySelectorAll('section[id]');
    const floatingNavList = document.getElementById('floating-nav-list');
    const sideNavList = document.getElementById('side-nav-list');

    const hamburgerMenuButton = document.getElementById('hamburger-menu-button');
    const sideMenu = document.getElementById('side-menu');
    const sideMenuOverlay = document.getElementById('side-menu-overlay');
    const closeSideMenuButton = document.getElementById('close-side-menu');

    let costBreakdownChart = null;
    let lastCalculatedData = null;

    // --- CÁC HẰNG SỐ VÀ TỶ LỆ TÍNH TOÁN --- //
    // Nhóm tất cả các hệ số vào một object để dễ quản lý và thay đổi.
    const COST_FACTORS = {
        BASE_PER_M2: {
            basic: 5000000,    // Gói cơ bản
            standard: 6500000, // Gói trung bình
            premium: 8500000   // Gói cao cấp
        },
        STYLE_MULTIPLIER: {
            modern: 1.0,       // Hiện đại
            neoclassical: 1.3, // Tân cổ điển
            minimalist: 0.95   // Tối giản
        },
        FOUNDATION_PER_M2: {
            simple: 250000,    // Móng đơn
            strip: 450000,     // Móng băng
            pile: 1000000      // Móng cọc
        },
        ROOF_PER_M2: {
            flat: 150000,      // Mái bằng
            thai: 400000,      // Mái Thái
            japanese: 500000   // Mái Nhật
        },
        AREA_MULTIPLIER: {
            MEZZANINE: 1.5, // Chi phí tầng lửng tính bằng 150% diện tích
            ROOFTOP: 0.5    // Chi phí sân thượng tính bằng 50% diện tích
        },
        COST_BREAKDOWN_RATIO: {
            ROUGH_PART: 0.6,       // Tỷ lệ chi phí phần thô trên chi phí xây dựng cơ bản
            FINISHING_PART: 0.4,   // Tỷ lệ chi phí hoàn thiện trên chi phí xây dựng cơ bản
            DESIGN_MANAGEMENT: 0.1 // Tỷ lệ chi phí thiết kế & quản lý trên tổng chi phí xây dựng
        }
    };

    // --- KHỞI TẠO --- //
    createTableOfContents();
    addEventListeners();

    // --- HÀM TẠO MỤC LỤC ĐỘNG --- //
    function createTableOfContents() {
        let navHTML = '';
        sections.forEach(section => {
            const sectionId = section.id;
            const sectionTitle = section.querySelector('h2, h3').textContent.trim();
            if (sectionId && sectionTitle) {
                navHTML += `<li><a href="#${sectionId}" class="nav-link">${sectionTitle}</a></li>`;
            }
        });
        floatingNavList.innerHTML = navHTML;
        sideNavList.innerHTML = navHTML;
    }

    // --- HÀM THÊM CÁC EVENT LISTENER --- //
    function addEventListeners() {
        form.addEventListener('submit', handleFormSubmit);
        sendEmailBtn.addEventListener('click', handleSendEmail);
        window.addEventListener('scroll', handleScroll);
        document.querySelectorAll('#factors-container button').forEach(button => {
            button.addEventListener('click', toggleCollapsible);
        });
        hamburgerMenuButton.addEventListener('click', toggleSideMenu);
        closeSideMenuButton.addEventListener('click', toggleSideMenu);
        sideMenuOverlay.addEventListener('click', toggleSideMenu);
        document.querySelectorAll('#side-menu a').forEach(link => {
            link.addEventListener('click', toggleSideMenu);
        });
    }

    // --- XỬ LÝ FORM --- //
    function handleFormSubmit(e) {
        e.preventDefault();
        if (calculateBtn.classList.contains('loading')) return;

        hideError();
        hideNotification();
        resultsSection.classList.add('hidden', 'opacity-0');
        setLoadingState(true);

        const inputs = getFormInputs();

        if (!validateInputs(inputs)) {
            setLoadingState(false);
            return;
        }

        setTimeout(() => {
            const calculationResult = calculateCost(inputs);
            lastCalculatedData = { inputs, calculationResult };
            displayResults(calculationResult);
            setLoadingState(false);
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 1500);
    }

    function getFormInputs() {
        return {
            area: parseFloat(document.getElementById('area').value),
            floors: parseInt(document.getElementById('floors').value),
            style: document.getElementById('style').value,
            finish: document.getElementById('finish').value,
            foundationType: document.getElementById('foundation_type').value,
            mezzanineOption: document.getElementById('mezzanine_option').value,
            rooftopOption: document.getElementById('rooftop_option').value,
            roofType: document.getElementById('roof_type').value,
            email: document.getElementById('email').value.trim()
        };
    }

    function validateInputs(inputs) {
        if (isNaN(inputs.area) || inputs.area <= 0 || isNaN(inputs.floors) || inputs.floors <= 0) {
            showError('Vui lòng nhập diện tích và số tầng hợp lệ.');
            return false;
        }
        if (!inputs.email || !/^\S+@\S+\.\S+$/.test(inputs.email)) {
             showError('Vui lòng nhập một địa chỉ email hợp lệ.');
            return false;
        }
        return true;
    }

    function setLoadingState(isLoading) {
        calculateBtn.disabled = isLoading;
        if (isLoading) {
            calculateBtn.classList.add('loading');
            calculateBtn.querySelector('span').textContent = 'Đang tính toán...';
        } else {
            calculateBtn.classList.remove('loading');
            calculateBtn.querySelector('span').textContent = 'Ước tính Chi phí';
        }
    }

    // --- LOGIC TÍNH TOÁN CHI PHÍ --- //
    function calculateCost(inputs) {
        const { area, floors, style, finish, foundationType, mezzanineOption, rooftopOption, roofType } = inputs;

        // 1. Tính tổng diện tích xây dựng (Total Construction Area - TCA)
        // Diện tích cơ bản = diện tích sàn * số tầng
        let totalArea = area * floors;
        // Cộng thêm diện tích tầng lửng (nếu có)
        if (mezzanineOption === 'yes') {
            totalArea += area * COST_FACTORS.AREA_MULTIPLIER.MEZZANINE;
        }
        // Cộng thêm diện tích sân thượng (nếu có)
        if (rooftopOption === 'yes') {
            totalArea += area * COST_FACTORS.AREA_MULTIPLIER.ROOFTOP;
        }

        // 2. Chi phí xây dựng cơ bản (chưa bao gồm móng, mái và quản lý)
        // Được tính dựa trên tổng diện tích và các hệ số về gói hoàn thiện, phong cách.
        const baseConstructionCost = totalArea * COST_FACTORS.BASE_PER_M2[finish] * COST_FACTORS.STYLE_MULTIPLIER[style];

        // 3. Chi phí móng (tính trên diện tích sàn trệt)
        const foundationCost = area * COST_FACTORS.FOUNDATION_PER_M2[foundationType];

        // 4. Chi phí mái (tính trên diện tích sàn mái)
        const roofCost = area * COST_FACTORS.ROOF_PER_M2[roofType];
        
        // 5. Phân bổ chi phí từ chi phí xây dựng cơ bản
        // Chi phí phần thô = 60% chi phí cơ bản + chi phí móng + chi phí mái
        const roughPartCost = baseConstructionCost * COST_FACTORS.COST_BREAKDOWN_RATIO.ROUGH_PART + foundationCost + roofCost;
        // Chi phí hoàn thiện = 40% chi phí cơ bản
        const finishingCost = baseConstructionCost * COST_FACTORS.COST_BREAKDOWN_RATIO.FINISHING_PART;
        
        // 6. Chi phí thiết kế & quản lý (tính 10% trên tổng chi phí thô và hoàn thiện)
        const subTotal = roughPartCost + finishingCost;
        const designAndManagementCost = subTotal * COST_FACTORS.COST_BREAKDOWN_RATIO.DESIGN_MANAGEMENT;
        
        // 7. Tổng chi phí cuối cùng
        const totalCost = subTotal + designAndManagementCost;

        return {
            totalCost,
            breakdown: {
                'Phần thô (Kết cấu, Móng, Mái)': roughPartCost,
                'Hoàn thiện (Sơn, Gạch, TBVS...)': finishingCost,
                'Thiết kế & Quản lý dự án': designAndManagementCost
            },
            detailedBreakdown: {
                'Chi phí móng': foundationCost,
                'Chi phí kết cấu & xây thô': baseConstructionCost * COST_FACTORS.COST_BREAKDOWN_RATIO.ROUGH_PART,
                'Chi phí mái': roofCost,
                'Chi phí hoàn thiện': finishingCost,
                'Chi phí thiết kế & quản lý': designAndManagementCost
            },
            paymentSchedule: generatePaymentSchedule(totalCost)
        };
    }
    
    function generatePaymentSchedule(totalCost) {
        return [
            { phase: 'Đợt 1', task: 'Ký hợp đồng, tạm ứng', rate: 0.10, amount: totalCost * 0.10 },
            { phase: 'Đợt 2', task: 'Hoàn thành phần móng', rate: 0.20, amount: totalCost * 0.20 },
            { phase: 'Đợt 3', task: 'Hoàn thành khung bê tông cốt thép', rate: 0.30, amount: totalCost * 0.30 },
            { phase: 'Đợt 4', task: 'Hoàn thành phần xây tô, ốp lát', rate: 0.20, amount: totalCost * 0.20 },
            { phase: 'Đợt 5', task: 'Hoàn thiện sơn nước, lắp đặt thiết bị', rate: 0.15, amount: totalCost * 0.15 },
            { phase: 'Đợt 6', task: 'Nghiệm thu, bàn giao công trình', rate: 0.05, amount: totalCost * 0.05 }
        ];
    }

    // --- HIỂN THỊ KẾT QUẢ --- //
    function displayResults(result) {
        estimatedCostEl.textContent = `${formatCurrency(result.totalCost)} VNĐ`;
        updateChart(result.breakdown);
        updateDetailedBreakdownTable(result.detailedBreakdown);
        updatePaymentScheduleTable(result.paymentSchedule);

        resultsSection.classList.remove('hidden');
        setTimeout(() => resultsSection.classList.remove('opacity-0'), 100);
    }

    function updateChart(breakdownData) {
        const ctx = document.getElementById('costBreakdownChart').getContext('2d');
        const labels = Object.keys(breakdownData);
        const data = Object.values(breakdownData);

        if (costBreakdownChart) {
            costBreakdownChart.destroy();
        }

        costBreakdownChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Phân bổ chi phí',
                    data: data,
                    backgroundColor: [ 'rgba(217, 119, 6, 0.8)', 'rgba(251, 191, 36, 0.8)', 'rgba(31, 41, 55, 0.7)' ],
                    borderColor: [ 'rgba(217, 119, 6, 1)', 'rgba(251, 191, 36, 1)', 'rgba(31, 41, 55, 1)' ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 14, family: "'Be Vietnam Pro', sans-serif" } } },
                    tooltip: {
                        callbacks: {
                            label: context => `${context.label || ''}: ${formatCurrency(context.parsed)} VNĐ`
                        }
                    }
                }
            }
        });
    }
    
    function updateDetailedBreakdownTable(detailedData) {
        let tableHTML = '';
        const mainCategories = {
            'Phần Thô': ['Chi phí móng', 'Chi phí kết cấu & xây thô', 'Chi phí mái'],
            'Hoàn Thiện': ['Chi phí hoàn thiện'],
            'Chi phí khác': ['Chi phí thiết kế & quản lý']
        };

        for (const mainCategory in mainCategories) {
            const subItems = mainCategories[mainCategory];
            subItems.forEach((item, index) => {
                const cost = detailedData[item] || 0;
                tableHTML += `
                    <tr class="border-t border-gray-200">
                        ${index === 0 ? `<td class="px-5 py-4 font-medium text-gray-800 align-top" rowspan="${subItems.length}">${mainCategory}</td>` : ''}
                        <td class="px-5 py-4 text-gray-600">${item}</td>
                        <td class="px-5 py-4 text-right font-semibold text-gray-700">${formatCurrency(cost)}</td>
                    </tr>
                `;
            });
        }
        detailedBreakdownTableBody.innerHTML = tableHTML;
    }

    function updatePaymentScheduleTable(scheduleData) {
        let tableHTML = '';
        scheduleData.forEach(item => {
            tableHTML += `
                <tr class="border-t border-gray-200">
                    <td class="px-5 py-4 font-medium text-gray-800">${item.phase}</td>
                    <td class="px-5 py-4 text-gray-600">${item.task}</td>
                    <td class="px-5 py-4 text-right text-gray-700">${(item.rate * 100).toFixed(0)}%</td>
                    <td class="px-5 py-4 text-right font-semibold text-gray-700">${formatCurrency(item.amount)}</td>
                </tr>
            `;
        });
        paymentScheduleTableBody.innerHTML = tableHTML;
    }

    // --- XỬ LÝ GỬI EMAIL (MOCKUP) --- //
    function handleSendEmail() {
        if (!lastCalculatedData) {
            showError("Vui lòng thực hiện tính toán trước khi gửi email.");
            return;
        }
        
        sendEmailBtn.disabled = true;
        sendEmailBtn.querySelector('span').textContent = 'Đang gửi...';

        setTimeout(() => {
            showNotification(`Yêu cầu báo giá đã được gửi thành công đến <strong>${lastCalculatedData.inputs.email}</strong>. Vui lòng kiểm tra hộp thư của bạn.`, 'success');
            sendEmailBtn.disabled = false;
            sendEmailBtn.querySelector('span').textContent = 'Gửi Yêu cầu Báo giá qua Email';
        }, 2000);
    }

    // --- XỬ LÝ THANH ĐIỀU HƯỚNG VÀ CUỘN --- //
    function handleScroll() {
        let currentSectionId = '';
        const scrollPosition = window.scrollY + window.innerHeight / 2;

        sections.forEach(section => {
            if (scrollPosition >= section.offsetTop) {
                currentSectionId = section.id;
            }
        });
        updateActiveNavLink(currentSectionId, '#floating-toc-menu a');
        updateActiveNavLink(currentSectionId, '#side-menu a');
    }
    
    function updateActiveNavLink(activeId, selector) {
         document.querySelectorAll(selector).forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${activeId}`) {
                link.classList.add('active');
            }
        });
    }

    // --- XỬ LÝ CÁC MỤC CÓ THỂ THU GỌN --- //
    function toggleCollapsible(event) {
        const button = event.currentTarget;
        const content = button.nextElementSibling.querySelector('.collapsible-content');
        const icon = button.querySelector('span');
        
        const isOpening = !content.classList.contains('open');

        // Đóng tất cả các mục đang mở
        document.querySelectorAll('.collapsible-content.open').forEach(openContent => {
            openContent.classList.remove('open');
            const openButton = openContent.closest('.content-card').querySelector('button');
            if(openButton) {
                openButton.querySelector('span').textContent = '+';
                openButton.querySelector('span').style.transform = 'rotate(0deg)';
            }
        });

        // Mở mục được click (nếu nó đang đóng)
        if (isOpening) {
            content.classList.add('open');
            icon.textContent = '-';
            icon.style.transform = 'rotate(180deg)';
        }
    }

    // --- XỬ LÝ MENU DI ĐỘNG --- //
    function toggleSideMenu() {
        const isMenuOpen = sideMenu.classList.contains('translate-x-full');
        if (isMenuOpen) {
            sideMenu.classList.remove('translate-x-full');
            sideMenuOverlay.classList.remove('hidden');
            setTimeout(() => sideMenuOverlay.classList.remove('opacity-0'), 10);
            document.body.style.overflow = 'hidden';
        } else {
            sideMenu.classList.add('translate-x-full');
            sideMenuOverlay.classList.add('opacity-0');
            setTimeout(() => sideMenuOverlay.classList.add('hidden'), 300);
            document.body.style.overflow = '';
        }
    }

    // --- CÁC HÀM TIỆN ÍCH --- //
    function formatCurrency(number) {
        return new Intl.NumberFormat('vi-VN').format(Math.round(number));
    }

    function showError(message) {
        costErrorEl.textContent = message;
        costErrorEl.classList.remove('hidden');
    }

    function hideError() {
        costErrorEl.classList.add('hidden');
    }

    function showNotification(message, type = 'success') {
        emailNotificationEl.innerHTML = message;
        emailNotificationEl.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-blue-100', 'text-blue-800');
        if (type === 'success') {
             emailNotificationEl.classList.add('bg-green-100', 'text-green-800');
        } else {
             emailNotificationEl.classList.add('bg-blue-100', 'text-blue-800');
        }
    }

    function hideNotification() {
        emailNotificationEl.classList.add('hidden');
    }
});
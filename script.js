document.addEventListener('DOMContentLoaded', function () {
    // --- KHAI BÁO BIẾN --- //
    const form = document.getElementById('estimatorForm');
    const calculateBtn = document.getElementById('calculateBtn');
    const costLoadingSpinner = document.getElementById('costLoadingSpinner');
    const estimatedCostEl = document.getElementById('estimatedCost');
    const resultsSection = document.getElementById('resultsSection');
    const costErrorEl = document.getElementById('costError');
    const emailNotificationEl = document.getElementById('emailNotification');
    const sendEmailBtn = document.getElementById('sendEmailBtn');
    
    const detailedBreakdownTableBody = document.getElementById('detailedBreakdownTableBody');
    const paymentScheduleTableBody = document.getElementById('paymentScheduleTableBody');

    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('#floating-toc-menu a, #side-menu a');
    const floatingNavList = document.getElementById('floating-nav-list');
    const sideNavList = document.getElementById('side-nav-list');

    const hamburgerMenuButton = document.getElementById('hamburger-menu-button');
    const sideMenu = document.getElementById('side-menu');
    const sideMenuOverlay = document.getElementById('side-menu-overlay');
    const closeSideMenuButton = document.getElementById('close-side-menu');

    let costBreakdownChart = null;
    let lastCalculatedData = null;

    // --- CÁC HẰNG SỐ TÍNH TOÁN --- //
    const BASE_COST_PER_M2 = {
        basic: 5000000,    // Cơ bản
        standard: 6500000, // Trung bình
        premium: 8500000   // Cao cấp
    };

    const STYLE_MULTIPLIER = {
        modern: 1.0,       // Hiện đại
        neoclassical: 1.3, // Tân cổ điển
        minimalist: 0.95   // Tối giản
    };
    
    const FOUNDATION_COST_PER_M2 = {
        simple: 250000,    // Móng đơn
        strip: 450000,     // Móng băng
        pile: 1000000      // Móng cọc
    };

    const ROOF_COST_PER_M2 = {
        flat: 150000,      // Mái bằng
        thai: 400000,      // Mái Thái
        japanese: 500000   // Mái Nhật
    };

    const MEZZANINE_MULTIPLIER = 1.5; // Chi phí tầng lửng = 150% diện tích
    const ROOFTOP_MULTIPLIER = 0.5;   // Chi phí sân thượng = 50% diện tích

    // --- KHỞI TẠO --- //
    
    // Tạo mục lục động
    createTableOfContents();
    
    // Thêm sự kiện cho các thành phần
    addEventListeners();


    // --- HÀM TẠO MỤC LỤC ĐỘNG --- //
    function createTableOfContents() {
        let navHTML = '';
        sections.forEach(section => {
            const sectionId = section.id;
            // Lấy tiêu đề từ thẻ h2 hoặc h3 đầu tiên trong section
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
        // Sự kiện submit form
        form.addEventListener('submit', handleFormSubmit);

        // Sự kiện click nút gửi email
        sendEmailBtn.addEventListener('click', handleSendEmail);

        // Sự kiện cuộn trang để cập nhật mục lục
        window.addEventListener('scroll', handleScroll);

        // Sự kiện cho các mục có thể thu gọn
        document.querySelectorAll('#factors-container button').forEach(button => {
            button.addEventListener('click', toggleCollapsible);
        });

        // Sự kiện cho menu di động (hamburger)
        hamburgerMenuButton.addEventListener('click', toggleSideMenu);
        closeSideMenuButton.addEventListener('click', toggleSideMenu);
        sideMenuOverlay.addEventListener('click', toggleSideMenu);
        
        // Đóng menu khi click vào một link
        document.querySelectorAll('#side-menu a').forEach(link => {
            link.addEventListener('click', toggleSideMenu);
        });
    }

    // --- XỬ LÝ FORM --- //
    function handleFormSubmit(e) {
        e.preventDefault();
        if (calculateBtn.classList.contains('loading')) return;

        // Xóa lỗi và thông báo cũ
        hideError();
        hideNotification();
        resultsSection.classList.add('hidden');
        resultsSection.classList.add('opacity-0');


        // Hiển thị spinner và vô hiệu hóa nút
        setLoadingState(true);

        // Lấy giá trị từ form
        const inputs = getFormInputs();

        // Kiểm tra dữ liệu đầu vào
        if (!validateInputs(inputs)) {
            setLoadingState(false);
            return;
        }

        // Mô phỏng thời gian tính toán
        setTimeout(() => {
            // Tính toán chi phí
            const calculationResult = calculateCost(inputs);
            lastCalculatedData = { inputs, calculationResult };

            // Hiển thị kết quả
            displayResults(calculationResult);

            // Tắt spinner và kích hoạt lại nút
            setLoadingState(false);
            
            // Cuộn đến phần kết quả
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        }, 1500); // 1.5 giây
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
        if (isLoading) {
            calculateBtn.classList.add('loading');
            calculateBtn.disabled = true;
            calculateBtn.querySelector('span').textContent = 'Đang tính toán...';
        } else {
            calculateBtn.classList.remove('loading');
            calculateBtn.disabled = false;
            calculateBtn.querySelector('span').textContent = 'Ước tính Chi phí';
        }
    }

    // --- LOGIC TÍNH TOÁN CHI PHÍ --- //
    function calculateCost(inputs) {
        const { area, floors, style, finish, foundationType, mezzanineOption, rooftopOption, roofType } = inputs;

        // 1. Tính tổng diện tích xây dựng (Total Construction Area - TCA)
        let totalArea = area * floors;
        if (mezzanineOption === 'yes') {
            totalArea += area * MEZZANINE_MULTIPLIER;
        }
        if (rooftopOption === 'yes') {
            totalArea += area * ROOFTOP_MULTIPLIER;
        }

        // 2. Chi phí xây dựng cơ bản
        const baseConstructionCost = totalArea * BASE_COST_PER_M2[finish] * STYLE_MULTIPLIER[style];

        // 3. Chi phí móng
        const foundationCost = area * FOUNDATION_COST_PER_M2[foundationType];

        // 4. Chi phí mái
        const roofCost = area * ROOF_COST_PER_M2[roofType];
        
        // 5. Phân bổ chi phí
        const roughPartCost = baseConstructionCost * 0.6 + foundationCost + roofCost; // Phần thô ~60%
        const finishingCost = baseConstructionCost * 0.4; // Hoàn thiện ~40%
        const designAndManagementCost = (roughPartCost + finishingCost) * 0.1; // Thiết kế & quản lý ~10%
        
        // 6. Tổng chi phí
        const totalCost = roughPartCost + finishingCost + designAndManagementCost;

        return {
            totalCost,
            breakdown: {
                'Phần thô (Kết cấu, Móng, Mái)': roughPartCost,
                'Hoàn thiện (Sơn, Gạch, TBVS...)': finishingCost,
                'Thiết kế & Quản lý dự án': designAndManagementCost
            },
            detailedBreakdown: {
                'Chi phí móng': foundationCost,
                'Chi phí kết cấu & xây thô': baseConstructionCost * 0.6,
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
        // Hiển thị tổng chi phí
        estimatedCostEl.textContent = `${formatCurrency(result.totalCost)} VNĐ`;
        
        // Cập nhật biểu đồ
        updateChart(result.breakdown);
        
        // Cập nhật bảng chi tiết
        updateDetailedBreakdownTable(result.detailedBreakdown);

        // Cập nhật lịch thanh toán
        updatePaymentScheduleTable(result.paymentSchedule);

        // Hiển thị phần kết quả
        resultsSection.classList.remove('hidden');
        setTimeout(() => {
            resultsSection.classList.remove('opacity-0');
        }, 100); // Delay nhỏ để transition hoạt động
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
                    backgroundColor: [
                        'rgba(217, 119, 6, 0.8)',   // --secondary-color
                        'rgba(251, 191, 36, 0.8)', // --primary-color
                        'rgba(31, 41, 55, 0.7)'    // --dark-blue
                    ],
                    borderColor: [
                        'rgba(217, 119, 6, 1)',
                        'rgba(251, 191, 36, 1)',
                        'rgba(31, 41, 55, 1)'
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
                            font: {
                                size: 14,
                                family: "'Be Vietnam Pro', sans-serif"
                            }
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
                                    label += formatCurrency(context.parsed) + ' VNĐ';
                                }
                                return label;
                            }
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
        sendEmailBtn.textContent = 'Đang gửi...';

        // Đây là nơi bạn sẽ gọi API backend để gửi email
        // Vì mục đích demo, chúng ta sẽ mô phỏng nó
        setTimeout(() => {
            showNotification(`Yêu cầu báo giá đã được gửi thành công đến <strong>${lastCalculatedData.inputs.email}</strong>. Vui lòng kiểm tra hộp thư của bạn.`, 'success');
            sendEmailBtn.disabled = false;
            sendEmailBtn.textContent = 'Gửi Yêu cầu Báo giá qua Email';
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

        // Cập nhật trạng thái active cho cả hai menu
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
        
        if (content.classList.contains('open')) {
            content.classList.remove('open');
            icon.textContent = '+';
            icon.style.transform = 'rotate(0deg)';
        } else {
            // Đóng tất cả các mục khác trước khi mở mục mới
            document.querySelectorAll('.collapsible-content.open').forEach(openContent => {
                openContent.classList.remove('open');
                const openButton = openContent.closest('.content-card').querySelector('button');
                if(openButton) {
                    openButton.querySelector('span').textContent = '+';
                    openButton.querySelector('span').style.transform = 'rotate(0deg)';
                }
            });
            content.classList.add('open');
            icon.textContent = '-';
            icon.style.transform = 'rotate(180deg)';
        }
    }

    // --- XỬ LÝ MENU DI ĐỘNG --- //
    function toggleSideMenu() {
        const isMenuOpen = sideMenu.classList.contains('translate-x-full');
        if (isMenuOpen) {
            // Mở menu
            sideMenu.classList.remove('translate-x-full');
            sideMenuOverlay.classList.remove('hidden');
            setTimeout(() => sideMenuOverlay.classList.remove('opacity-0'), 10);
            document.body.style.overflow = 'hidden'; // Ngăn cuộn trang nền
        } else {
            // Đóng menu
            sideMenu.classList.add('translate-x-full');
            sideMenuOverlay.classList.add('opacity-0');
            setTimeout(() => sideMenuOverlay.classList.add('hidden'), 300);
            document.body.style.overflow = ''; // Cho phép cuộn lại
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

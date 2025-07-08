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
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenuButton = document.getElementById('hamburger-menu-button');
    const sideMenu = document.getElementById('side-menu');
    const closeSideMenuButton = document.getElementById('close-side-menu');
    const sideMenuOverlay = document.getElementById('side-menu-overlay');
    const sideNavList = document.getElementById('side-nav-list'); // Lấy danh sách menu

    // Function để mở side menu
    function openSideMenu() {
        sideMenu.classList.remove('translate-x-full');
        sideMenu.classList.add('translate-x-0');
        sideMenuOverlay.classList.remove('hidden');
        setTimeout(() => sideMenuOverlay.classList.add('opacity-50'), 10);
        document.body.style.overflow = 'hidden'; // Ngăn cuộn trang chính
    }

    // Function để đóng side menu
    function closeSideMenu() {
        sideMenu.classList.remove('translate-x-0');
        sideMenu.classList.add('translate-x-full');
        sideMenuOverlay.classList.remove('opacity-50');
        setTimeout(() => sideMenuOverlay.classList.add('hidden'), 300); // 300ms = transition duration
        document.body.style.overflow = ''; // Cho phép cuộn trang chính
    }

    // Event listeners
    hamburgerMenuButton.addEventListener('click', openSideMenu);
    closeSideMenuButton.addEventListener('click', closeSideMenu);
    sideMenuOverlay.addEventListener('click', closeSideMenu);

    // Đóng side menu khi nhấp vào một liên kết trong menu
    sideNavList.addEventListener('click', (event) => {
        if (event.target.tagName === 'A' && event.target.closest('ul') === sideNavList) {
            closeSideMenu();
        }
    });

    // Code cho Collapsible Factors (yếu tố ảnh hưởng) - Đảm bảo rằng nó vẫn hoạt động
    const factorButtons = document.querySelectorAll('#factors-container button');
    factorButtons.forEach(button => {
        button.addEventListener('click', () => {
            const contentCard = button.closest('.content-card');
            const collapsibleContent = contentCard.querySelector('.collapsible-content');
            const icon = button.querySelector('span');

            if (collapsibleContent.style.maxHeight) {
                collapsibleContent.style.maxHeight = null;
                collapsibleContent.style.paddingTop = '0';
                collapsibleContent.style.paddingBottom = '0';
                icon.textContent = '+';
            } else {
                collapsibleContent.style.maxHeight = collapsibleContent.scrollHeight + 'px';
                collapsibleContent.style.paddingTop = '1rem'; // p-4 = 1rem
                collapsibleContent.style.paddingBottom = '1.25rem'; // p-5 = 1.25rem (adjust if needed)
                icon.textContent = '-';
            }
        });
    });

    // ... (Giữ nguyên các script khác của bạn như tính toán chi phí, biểu đồ, v.v.)
});
document.addEventListener('DOMContentLoaded', () => {
    // ... (Giữ nguyên các đoạn mã hiện có của bạn cho hamburger menu, collapsible sections, và tính toán chi phí) ...

    const calculateBtn = document.getElementById('calculateBtn');
    const estimatorForm = document.getElementById('estimatorForm');
    const estimatedCostElement = document.getElementById('estimatedCost');
    const resultsSection = document.getElementById('resultsSection');
    const emailInput = document.getElementById('email'); // Lấy trường email của khách hàng

    // Lấy các element mới cho việc gửi email
    const sendEmailLink = document.getElementById('sendEmailLink'); // Liên kết mới
    const emailLoadingSpinner = document.getElementById('emailLoadingSpinner'); // Spinner mới (nếu có)

    // Function để định dạng số tiền VND
    function formatCurrencyVND(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }

    // Biến để lưu trữ chi phí ước tính và email khách hàng sau khi tính toán
    let currentEstimatedCost = 0;
    let customerEmail = '';

    estimatorForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const area = parseFloat(document.getElementById('area').value);
        const floors = parseInt(document.getElementById('floors').value);
        const style = document.getElementById('style').value;
        const finish = document.getElementById('finish').value;
        const foundationType = document.getElementById('foundation_type').value;
        const mezzanineOption = document.getElementById('mezzanine_option').value;
        const rooftopOption = document.getElementById('rooftop_option').value;
        const roofType = document.getElementById('roof_type').value;
        customerEmail = emailInput.value; // Cập nhật email khách hàng

        if (isNaN(area) || isNaN(floors) || area <= 0 || floors <= 0) {
            document.getElementById('costError').textContent = 'Vui lòng nhập diện tích và số tầng hợp lệ.';
            document.getElementById('costError').classList.remove('hidden');
            resultsSection.classList.add('hidden', 'opacity-0');
            return;
        } else {
            document.getElementById('costError').classList.add('hidden');
        }

        // Hiện spinner tính toán
        document.getElementById('costLoadingSpinner').classList.remove('hidden');
        calculateBtn.disabled = true;
        sendEmailLink.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed'); // Vô hiệu hóa link gửi email

        // Mô phỏng quá trình tính toán (có thể thay thế bằng AJAX call thực tế nếu cần)
        setTimeout(() => {
            let baseCostPerSqMeter = 0; // Giá cơ bản mỗi m2

            // Ví dụ về giá ước tính dựa trên mức độ hoàn thiện
            switch (finish) {
                case 'basic':
                    baseCostPerSqMeter = 5000000; // VNĐ/m2
                    break;
                case 'standard':
                    baseCostPerSqMeter = 6500000; // VNĐ/m2
                    break;
                case 'premium':
                    baseCostPerSqMeter = 8000000; // VNĐ/m2
                    break;
            }

            // Điều chỉnh theo số tầng (ví dụ: tầng càng cao chi phí móng/kết cấu/vận chuyển tăng)
            baseCostPerSqMeter += (floors - 1) * 200000; // Cộng thêm 200k/m2 cho mỗi tầng sau tầng 1

            // Điều chỉnh theo phong cách
            if (style === 'neoclassical') baseCostPerSqMeter *= 1.15; // Tăng 15% cho tân cổ điển
            else if (style === 'minimalist') baseCostPerSqMeter *= 0.95; // Giảm 5% cho tối giản

            // Điều chỉnh theo loại móng
            if (foundationType === 'strip') baseCostPerSqMeter += 300000;
            else if (foundationType === 'pile') baseCostPerSqMeter += 700000;

            // Điều chỉnh cho tầng lửng (ví dụ: +50% diện tích lửng vào tổng diện tích tính tiền)
            let effectiveArea = area;
            if (mezzanineOption === 'yes') {
                effectiveArea += area * 0.5; // Giả sử tầng lửng tính 50% diện tích
            }

            // Điều chỉnh cho sân thượng (ví dụ: thêm chi phí cố định hoặc theo %)
            if (rooftopOption === 'yes') {
                baseCostPerSqMeter += 100000; // Thêm 100k/m2 cho sân thượng
            }

            // Điều chỉnh theo loại mái
            if (roofType === 'thai' || roofType === 'japanese') {
                baseCostPerSqMeter += 200000; // Thêm 200k/m2 cho mái dốc
            }

            currentEstimatedCost = effectiveArea * baseCostPerSqMeter;

            // Làm tròn đến hàng nghìn (ví dụ)
            currentEstimatedCost = Math.round(currentEstimatedCost / 1000) * 1000;

            estimatedCostElement.textContent = formatCurrencyVND(currentEstimatedCost);
            resultsSection.classList.remove('hidden');
            resultsSection.classList.add('opacity-100'); // Hiển thị kết quả với hiệu ứng fade
            
            // Cập nhật link mailto sau khi tính toán xong
            updateMailtoLink();

            document.getElementById('costLoadingSpinner').classList.add('hidden');
            calculateBtn.disabled = false;
            sendEmailLink.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed'); // Kích hoạt lại link gửi email

            // Tự động cuộn xuống phần kết quả
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        }, 1500); // Giả lập độ trễ 1.5 giây
    });

    // Hàm tạo và cập nhật liên kết mailto
    function updateMailtoLink() {
        if (currentEstimatedCost === 0 || !customerEmail) {
            sendEmailLink.setAttribute('href', '#');
            sendEmailLink.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
            return;
        }

        const companyEmail = 'esb.homes.company@gmail.com'; // Email của công ty
        const subject = encodeURIComponent('Yêu cầu báo giá xây dựng nhà phố trọn gói');

        // Lấy thông tin chi tiết từ form
        const area = parseFloat(document.getElementById('area').value);
        const floors = parseInt(document.getElementById('floors').value);
        const styleText = document.getElementById('style').options[document.getElementById('style').selectedIndex].text;
        const finishText = document.getElementById('finish').options[document.getElementById('finish').selectedIndex].text;
        const foundationTypeText = document.getElementById('foundation_type').options[document.getElementById('foundation_type').selectedIndex].text;
        const mezzanineOptionText = document.getElementById('mezzanine_option').options[document.getElementById('mezzanine_option').selectedIndex].text;
        const rooftopOptionText = document.getElementById('rooftop_option').options[document.getElementById('rooftop_option').selectedIndex].text;
        const roofTypeText = document.getElementById('roof_type').options[document.getElementById('roof_type').selectedIndex].text;

        const body = encodeURIComponent(
            `Kính gửi ESB Homes,\n\n` +
            `Tôi tên là [Tên của bạn/Khách hàng],\n` +
            `Email: ${customerEmail}\n\n` +
            `Tôi muốn yêu cầu báo giá chi tiết cho dự án xây dựng nhà phố với các thông tin sau:\n\n` +
            `- Diện tích sàn xây dựng: ${area} m²\n` +
            `- Số tầng: ${floors}\n` +
            `- Phong cách thiết kế: ${styleText}\n` +
            `- Mức độ hoàn thiện: ${finishText}\n` +
            `- Loại móng: ${foundationTypeText}\n` +
            `- Có tầng lửng: ${mezzanineOptionText}\n` +
            `- Có sân thượng: ${rooftopOptionText}\n` +
            `- Loại mái: ${roofTypeText}\n\n` +
            `Chi phí ước tính sơ bộ theo công cụ của quý công ty là: ${formatCurrencyVND(currentEstimatedCost)}\n\n` +
            `Rất mong nhận được sự tư vấn và báo giá chính xác từ quý công ty.\n\n` +
            `Xin chân thành cảm ơn!`
        );

        const mailtoLink = `mailto:${companyEmail}?subject=${subject}&body=${body}`;
        sendEmailLink.setAttribute('href', mailtoLink);
        sendEmailLink.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed'); // Kích hoạt lại liên kết
    }

    // Đảm bảo cập nhật link ngay khi trang tải nếu có giá trị sẵn (mặc dù ban đầu là 0)
    updateMailtoLink();

    // Event listener cho nút Gửi Yêu cầu Báo giá qua Email
    // Vì đã chuyển thành <a> tag với href, không cần event listener riêng cho nó nữa
    // Trừ khi bạn muốn thêm một hiệu ứng hoặc hành động khác trước khi mở mailto.
    // Nếu bạn muốn hiển thị spinner khi bấm nút gửi mail (mặc dù mailto thường không có loading)
    // sendEmailLink.addEventListener('click', () => {
    //     // Chỉ hiển thị spinner nếu link không bị disabled (tức là đã có giá trị)
    //     if (!sendEmailLink.classList.contains('disabled:opacity-50')) {
    //         emailLoadingSpinner.classList.remove('hidden');
    //         // Trong thực tế, bạn không thể biết khi nào email client mở hoặc gửi xong
    //         // Nên spinner sẽ cần bị ẩn đi sau một thời gian ngắn hoặc khi người dùng quay lại trình duyệt
    //         // Ví dụ: setTimeout(() => emailLoadingSpinner.classList.add('hidden'), 2000);
    //     }
    // });
});
document.addEventListener('DOMContentLoaded', () => {
    // ... (Giữ nguyên các đoạn mã hiện có của bạn cho hamburger menu, collapsible sections, và tính toán chi phí, updateMailtoLink) ...

    const calculateBtn = document.getElementById('calculateBtn');
    const estimatorForm = document.getElementById('estimatorForm');
    const estimatedCostElement = document.getElementById('estimatedCost');
    const resultsSection = document.getElementById('resultsSection');
    const emailInput = document.getElementById('email');

    const sendEmailLink = document.getElementById('sendEmailLink');
    // const emailLoadingSpinner = document.getElementById('emailLoadingSpinner'); // Không cần dùng nếu mailto không có spinner

    // Các biến mới cho PDF
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const pdfLoadingSpinner = document.getElementById('pdfLoadingSpinner');

    let currentEstimatedCost = 0;
    let customerEmail = '';

    // Function để định dạng số tiền VND (đã có)
    function formatCurrencyVND(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }

    // Biến để lưu trữ thông tin chi tiết cho PDF
    let calculationDetails = {};

    estimatorForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const area = parseFloat(document.getElementById('area').value);
        const floors = parseInt(document.getElementById('floors').value);
        const style = document.getElementById('style').value;
        const finish = document.getElementById('finish').value;
        const foundationType = document.getElementById('foundation_type').value;
        const mezzanineOption = document.getElementById('mezzanine_option').value;
        const rooftopOption = document.getElementById('rooftop_option').value;
        const roofType = document.getElementById('roof_type').value;
        customerEmail = emailInput.value;

        if (isNaN(area) || isNaN(floors) || area <= 0 || floors <= 0) {
            document.getElementById('costError').textContent = 'Vui lòng nhập diện tích và số tầng hợp lệ.';
            document.getElementById('costError').classList.remove('hidden');
            resultsSection.classList.add('hidden', 'opacity-0');
            return;
        } else {
            document.getElementById('costError').classList.add('hidden');
        }

        document.getElementById('costLoadingSpinner').classList.remove('hidden');
        calculateBtn.disabled = true;
        sendEmailLink.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
        downloadPdfBtn.disabled = true; // Vô hiệu hóa nút tải PDF
        downloadPdfBtn.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');


        setTimeout(() => {
            let baseCostPerSqMeter = 0;

            switch (finish) {
                case 'basic':
                    baseCostPerSqMeter = 5000000;
                    break;
                case 'standard':
                    baseCostPerSqMeter = 6500000;
                    break;
                case 'premium':
                    baseCostPerSqMeter = 8000000;
                    break;
            }

            baseCostPerSqMeter += (floors - 1) * 200000;

            if (style === 'neoclassical') baseCostPerSqMeter *= 1.15;
            else if (style === 'minimalist') baseCostPerSqMeter *= 0.95;

            if (foundationType === 'strip') baseCostPerSqMeter += 300000;
            else if (foundationType === 'pile') baseCostPerSqMeter += 700000;

            let effectiveArea = area;
            if (mezzanineOption === 'yes') {
                effectiveArea += area * 0.5;
            }

            if (rooftopOption === 'yes') {
                baseCostPerSqMeter += 100000;
            }

            if (roofType === 'thai' || roofType === 'japanese') {
                baseCostPerSqMeter += 200000;
            }

            currentEstimatedCost = effectiveArea * baseCostPerSqMeter;
            currentEstimatedCost = Math.round(currentEstimatedCost / 1000) * 1000;

            estimatedCostElement.textContent = formatCurrencyVND(currentEstimatedCost);
            resultsSection.classList.remove('hidden');
            resultsSection.classList.add('opacity-100');
            
            // Lấy thông tin chi tiết từ form cho PDF và biểu đồ
            const styleText = document.getElementById('style').options[document.getElementById('style').selectedIndex].text;
            const finishText = document.getElementById('finish').options[document.getElementById('finish').selectedIndex].text;
            const foundationTypeText = document.getElementById('foundation_type').options[document.getElementById('foundation_type').selectedIndex].text;
            const mezzanineOptionText = document.getElementById('mezzanine_option').options[document.getElementById('mezzanine_option').selectedIndex].text;
            const rooftopOptionText = document.getElementById('rooftop_option').options[document.getElementById('rooftop_option').selectedIndex].text;
            const roofTypeText = document.getElementById('roof_type').options[document.getElementById('roof_type').selectedIndex].text;

            calculationDetails = {
                area: area,
                floors: floors,
                style: styleText,
                finish: finishText,
                foundationType: foundationTypeText,
                mezzanine: mezzanineOptionText,
                rooftop: rooftopOptionText,
                roofType: roofTypeText,
                estimatedCost: currentEstimatedCost
            };

            // Cập nhật biểu đồ và bảng chi tiết
            updateCostBreakdownChart(currentEstimatedCost, area, floors, finish, style, foundationType, mezzanineOption, rooftopOption, roofType);
            updateDetailedBreakdownTable(currentEstimatedCost, area, floors, finish, style, foundationType, mezzanineOption, rooftopOption, roofType);
            updatePaymentScheduleTable(currentEstimatedCost);

            updateMailtoLink(); // Cập nhật link email
            
            document.getElementById('costLoadingSpinner').classList.add('hidden');
            calculateBtn.disabled = false;
            sendEmailLink.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
            downloadPdfBtn.disabled = false; // Kích hoạt nút tải PDF
            downloadPdfBtn.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');


            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        }, 1500);
    });

    // Hàm tạo và cập nhật liên kết mailto (giữ nguyên hoặc chỉnh sửa nhẹ)
    function updateMailtoLink() {
        if (currentEstimatedCost === 0 || !customerEmail) {
            sendEmailLink.setAttribute('href', '#');
            sendEmailLink.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
            return;
        }

        const companyEmail = 'esb.homes.company@gmail.com';
        const subject = encodeURIComponent('Yêu cầu báo giá xây dựng nhà phố trọn gói');

        // Sử dụng calculationDetails để xây dựng body
        const body = encodeURIComponent(
            `Kính gửi ESB Homes,\n\n` +
            `Tôi tên là [Tên của bạn/Khách hàng],\n` +
            `Email: ${customerEmail}\n\n` +
            `Tôi muốn yêu cầu báo giá chi tiết cho dự án xây dựng nhà phố với các thông tin sau:\n\n` +
            `- Diện tích sàn xây dựng: ${calculationDetails.area} m²\n` +
            `- Số tầng: ${calculationDetails.floors}\n` +
            `- Phong cách thiết kế: ${calculationDetails.style}\n` +
            `- Mức độ hoàn thiện: ${calculationDetails.finish}\n` +
            `- Loại móng: ${calculationDetails.foundationType}\n` +
            `- Có tầng lửng: ${calculationDetails.mezzanine}\n` +
            `- Có sân thượng: ${calculationDetails.rooftop}\n` +
            `- Loại mái: ${calculationDetails.roofType}\n\n` +
            `Chi phí ước tính sơ bộ theo công cụ của quý công ty là: ${formatCurrencyVND(calculationDetails.estimatedCost)}\n\n` +
            `Rất mong nhận được sự tư vấn và báo giá chính xác từ quý công ty.\n\n` +
            `Xin chân thành cảm ơn!`
        );

        const mailtoLink = `mailto:${companyEmail}?subject=${subject}&body=${body}`;
        sendEmailLink.setAttribute('href', mailtoLink);
        sendEmailLink.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
    }

    // Event listener cho nút tải PDF
    downloadPdfBtn.addEventListener('click', async () => {
        if (currentEstimatedCost === 0) {
            alert('Vui lòng ước tính chi phí trước khi tải báo giá PDF.');
            return;
        }

        pdfLoadingSpinner.classList.remove('hidden');
        downloadPdfBtn.disabled = true;
        downloadPdfBtn.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4'); // 'p' for portrait, 'pt' for points, 'a4' for size

        // Định nghĩa font tiếng Việt (cần phải nhúng font vào jsPDF, phức tạp hơn một chút)
        // Đây là ví dụ cơ bản không hỗ trợ font tiếng Việt đầy đủ (dấu)
        // Để hỗ trợ tiếng Việt, bạn cần convert font (.ttf) sang base64 và add vào jsPDF
        // Ví dụ: doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        // doc.setFont('Roboto');

        const margin = 40;
        let y = margin;
        const lineHeight = 14;

        // Tiêu đề
        doc.setFontSize(22);
        doc.text("Báo Giá Xây Dựng Nhà Phố Trọn Gói (Ước Tính)", margin, y);
        y += 30;

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Ngày: ${new Date().toLocaleDateString('vi-VN')}`, doc.internal.pageSize.getWidth() - margin, y, { align: 'right' });
        doc.setTextColor(0); // Reset color
        y += 20;

        // Thông tin công ty
        doc.setFontSize(12);
        doc.text("ESB Homes - Eco-Smart-Build", margin, y);
        y += lineHeight;
        doc.text("Địa chỉ: 14A Đường số 21, Phường Tân Quy, Quận 7, TP. Hồ Chí Minh", margin, y);
        y += lineHeight;
        doc.text("Hotline: 0899618286", margin, y);
        y += lineHeight * 2;


        // Thông tin khách hàng (nếu có)
        doc.setFontSize(14);
        doc.text("Thông tin Khách hàng:", margin, y);
        y += lineHeight + 5;
        doc.setFontSize(12);
        doc.text(`Email: ${customerEmail || 'Chưa cung cấp'}`, margin, y);
        y += lineHeight * 2;

        // Thông số ngôi nhà
        doc.setFontSize(14);
        doc.text("Thông số Ngôi nhà:", margin, y);
        y += lineHeight + 5;
        doc.setFontSize(12);
        doc.text(`- Diện tích sàn xây dựng: ${calculationDetails.area} m²`, margin, y);
        y += lineHeight;
        doc.text(`- Số tầng: ${calculationDetails.floors}`, margin, y);
        y += lineHeight;
        doc.text(`- Phong cách thiết kế: ${calculationDetails.style}`, margin, y);
        y += lineHeight;
        doc.text(`- Mức độ hoàn thiện: ${calculationDetails.finish}`, margin, y);
        y += lineHeight;
        doc.text(`- Loại móng: ${calculationDetails.foundationType}`, margin, y);
        y += lineHeight;
        doc.text(`- Có tầng lửng: ${calculationDetails.mezzanine}`, margin, y);
        y += lineHeight;
        doc.text(`- Có sân thượng: ${calculationDetails.rooftop}`, margin, y);
        y += lineHeight;
        doc.text(`- Loại mái: ${calculationDetails.roofType}`, margin, y);
        y += lineHeight * 2;

        // Tổng chi phí ước tính
        doc.setFontSize(16);
        doc.setTextColor('#D97706'); // Orange color
        doc.text("TỔNG CHI PHÍ ƯỚC TÍNH TRỌN GÓI:", margin, y);
        y += lineHeight + 5;
        doc.setFontSize(20);
        doc.text(formatCurrencyVND(currentEstimatedCost), margin, y);
        doc.setTextColor(0); // Reset color
        y += lineHeight * 2;

        doc.setFontSize(10);
        doc.text("(*Đây là ước tính sơ bộ dựa trên thông tin bạn cung cấp. Chi phí thực tế có thể thay đổi tùy thuộc vào chi tiết thiết kế, vật liệu cụ thể, điều kiện thi công và thời điểm xây dựng.)", margin, y, { maxWidth: doc.internal.pageSize.getWidth() - 2 * margin });
        y += lineHeight * 3;


        // Thêm bảng chi tiết và lịch trình thanh toán
        // Bạn sẽ cần tạo một cách để render HTML tables vào PDF.
        // jsPDF autotable là một plugin tuyệt vời cho việc này nhưng cần cài đặt riêng.
        // Nếu không có autotable, bạn sẽ phải vẽ từng dòng, từng cột.
        // Để đơn giản, tôi sẽ chuyển đổi các phần HTML sang hình ảnh và nhúng vào.

        // Chuyển đổi "Bảng Chi tiết Hạng mục" và "Lịch Trình Thanh toán" thành hình ảnh
        // Tạm thời ẩn các element không cần thiết hoặc gây nhiễu trước khi chụp
        // Ví dụ, ẩn floating-toc-menu và hamburger button nếu chúng chưa ẩn
        const tempHideElements = [
            document.getElementById('hamburger-menu-button'),
            document.getElementById('side-menu'),
            document.getElementById('side-menu-overlay'),
            // document.getElementById('floating-toc-menu') // Cái này đã ẩn bằng CSS rồi
        ];
        tempHideElements.forEach(el => el && (el.style.display = 'none'));

        // Cần lấy nội dung của section 'resultsSection' để chụp toàn bộ phần báo giá.
        // Hoặc lấy từng phần như detailedBreakdownSection, paymentScheduleSection riêng.
        // Để dễ, ta sẽ chụp ResultsSection trừ đi các nút.
        const contentToCapture = document.getElementById('resultsSection');
        const originalButtons = contentToCapture.querySelector('.flex-col.sm\\:flex-row'); // Lấy div chứa nút
        originalButtons.style.display = 'none'; // Tạm thời ẩn nút để không chụp vào PDF

        try {
            const canvas = await html2canvas(contentToCapture, {
                scale: 2, // Tăng độ phân giải
                useCORS: true, // Quan trọng nếu có ảnh từ các nguồn khác
                ignoreElements: (element) => {
                    // Bỏ qua các spinner khi chụp
                    return element.classList.contains('loading-spinner');
                }
            });

            originalButtons.style.display = 'flex'; // Hiện lại nút

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = doc.internal.pageSize.getWidth() - 2 * margin; // Chiều rộng hình ảnh trong PDF
            const imgHeight = (canvas.height * imgWidth) / canvas.width; // Chiều cao hình ảnh giữ tỉ lệ

            // Nếu nội dung quá dài cho 1 trang, cần chia trang
            let heightLeft = imgHeight;
            let position = y;

            doc.addPage(); // Bắt đầu trang mới cho phần này
            position = margin; // Đặt vị trí ban đầu trên trang mới

            while (heightLeft > 0) {
                doc.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
                heightLeft -= doc.internal.pageSize.getHeight();
                position -= doc.internal.pageSize.getHeight();

                if (heightLeft > 0) {
                    doc.addPage();
                }
            }
        } catch (error) {
            console.error("Error generating PDF from HTML:", error);
            alert("Đã xảy ra lỗi khi tạo báo giá PDF. Vui lòng thử lại sau.");
        } finally {
            // Hiển thị lại các phần tử đã ẩn tạm thời
            tempHideElements.forEach(el => el && (el.style.display = ''));
            originalButtons.style.display = 'flex';

            pdfLoadingSpinner.classList.add('hidden');
            downloadPdfBtn.disabled = false;
            downloadPdfBtn.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
        }

        // Lưu file PDF
        doc.save(`bao-gia-esbhomes-${calculationDetails.area}m2-${calculationDetails.floors}tang.pdf`);
    });

    // Các hàm update chart và table (cần được gọi khi tính toán)
    // Dữ liệu mẫu cho biểu đồ và bảng (bạn sẽ cần logic để điền dữ liệu thực tế hơn)
    function updateCostBreakdownChart(totalCost, area, floors, finish, style, foundationType, mezzanineOption, rooftopOption, roofType) {
        const ctx = document.getElementById('costBreakdownChart').getContext('2d');

        // Giá trị giả định cho phân bổ (cần điều chỉnh thực tế hơn)
        const costs = {
            construction: totalCost * 0.7, // Chi phí xây dựng thô
            finishing: totalCost * 0.2,    // Hoàn thiện
            design: totalCost * 0.05,      // Thiết kế
            misc: totalCost * 0.05         // Khác (phát sinh, giấy phép)
        };

        if (window.myPieChart) {
            window.myPieChart.destroy();
        }

        window.myPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Xây dựng thô', 'Hoàn thiện', 'Thiết kế', 'Chi phí khác'],
                datasets: [{
                    data: [costs.construction, costs.finishing, costs.design, costs.misc],
                    backgroundColor: ['#FBBF24', '#D97706', '#1F2937', '#6B7280'],
                    hoverOffset: 4
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
                                size: 14
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
                                    label += formatCurrencyVND(context.parsed);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    function updateDetailedBreakdownTable(totalCost, area, floors, finish, style, foundationType, mezzanineOption, rooftopOption, roofType) {
        const tableBody = document.getElementById('detailedBreakdownTableBody');
        tableBody.innerHTML = ''; // Xóa nội dung cũ

        // Tạo dữ liệu cho bảng chi tiết (cần logic chi tiết hơn từ tính toán của bạn)
        const breakdown = [
            { main: 'Chi phí xây dựng phần thô', detail: 'Kết cấu, tường bao, mái, sàn', cost: totalCost * 0.7 },
            { main: 'Chi phí hoàn thiện', detail: 'Sơn, ốp lát, thiết bị vệ sinh, điện nước cơ bản', cost: totalCost * 0.2 },
            { main: 'Chi phí thiết kế', detail: 'Kiến trúc, kết cấu, điện nước, phối cảnh', cost: totalCost * 0.05 },
            { main: 'Chi phí khác & dự phòng', detail: 'Giấy phép, giám sát, phát sinh', cost: totalCost * 0.05 },
        ];

        breakdown.forEach(item => {
            const row = tableBody.insertRow();
            row.classList.add('border-b', 'border-gray-100');
            row.innerHTML = `
                <td class="px-5 py-3 font-semibold text-[#1F2937]">${item.main}</td>
                <td class="px-5 py-3 text-gray-700">${item.detail}</td>
                <td class="px-5 py-3 text-right font-medium text-[#D97706]">${formatCurrencyVND(item.cost)}</td>
            `;
        });
    }

    function updatePaymentScheduleTable(totalCost) {
        const tableBody = document.getElementById('paymentScheduleTableBody');
        tableBody.innerHTML = ''; // Xóa nội dung cũ

        const schedule = [
            { phase: 'Đợt 1: Ký hợp đồng', content: 'Tạm ứng', percentage: 10, amount: totalCost * 0.10 },
            { phase: 'Đợt 2: Hoàn thành móng', content: 'Thi công phần móng', percentage: 20, amount: totalCost * 0.20 },
            { phase: 'Đợt 3: Hoàn thành phần thô', content: 'Thi công kết cấu, sàn, tường, mái', percentage: 30, amount: totalCost * 0.30 },
            { phase: 'Đợt 4: Hoàn thành phần hoàn thiện', content: 'Ốp lát, sơn, lắp đặt thiết bị', percentage: 30, amount: totalCost * 0.30 },
            { phase: 'Đợt 5: Bàn giao', content: 'Nghiệm thu, bảo hành', percentage: 10, amount: totalCost * 0.10 }
        ];

        schedule.forEach(item => {
            const row = tableBody.insertRow();
            row.classList.add('border-b', 'border-gray-100');
            row.innerHTML = `
                <td class="px-5 py-3 font-semibold text-[#1F2937]">${item.phase}</td>
                <td class="px-5 py-3 text-gray-700">${item.content}</td>
                <td class="px-5 py-3 text-right">${item.percentage}%</td>
                <td class="px-5 py-3 text-right font-medium text-[#D97706]">${formatCurrencyVND(item.amount)}</td>
            `;
        });
    }

    // Khởi tạo trạng thái ban đầu cho các nút
    updateMailtoLink();
    downloadPdfBtn.disabled = true;
    downloadPdfBtn.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
});

document.addEventListener('DOMContentLoaded', function () {
    // --- KHAI BÁO BIẾN --- //
    const form = document.getElementById('estimatorForm');
    const calculateBtn = document.getElementById('calculateBtn');
    const estimatedCostEl = document.getElementById('estimatedCost');
    const resultsSection = document.getElementById('resultsSection');
    const costErrorEl = document.getElementById('costError');
    const emailNotificationEl = document.getElementById('emailNotification');
    
    // Đã thay đổi sendEmailBtn thành sendEmailLink vì nó là <a> tag
    const sendEmailLink = document.getElementById('sendEmailLink'); 
    
    // Các biến cho PDF
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const pdfLoadingSpinner = document.getElementById('pdfLoadingSpinner');

    const detailedBreakdownTableBody = document.getElementById('detailedBreakdownTableBody');
    const paymentScheduleTableBody = document.getElementById('paymentScheduleTableBody');

    const sections = document.querySelectorAll('section[id]');
    const floatingNavList = document.getElementById('floating-nav-list');
    const sideNavList = document.getElementById('side-nav-list'); // Đảm bảo ID này tồn tại trong HTML

    const hamburgerMenuButton = document.getElementById('hamburger-menu-button');
    const sideMenu = document.getElementById('side-menu');
    const sideMenuOverlay = document.getElementById('side-menu-overlay');
    const closeSideMenuButton = document.getElementById('close-side-menu');
    
    const emailInput = document.getElementById('email'); // Lấy trường email của khách hàng

    let costBreakdownChart = null;
    let lastCalculatedData = null; // Lưu trữ dữ liệu tính toán cuối cùng
    let currentEstimatedCost = 0; // Biến này sẽ lưu trữ tổng chi phí ước tính
    let customerEmail = ''; // Biến này sẽ lưu trữ email khách hàng

    // --- CÁC HẰNG SỐ VÀ TỶ LỆ TÍNH TOÁN --- //
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
            MEZZANINE: 0.5, // Chi phí tầng lửng tính bằng 50% diện tích sàn trệt thêm vào tổng diện tích tính tiền
            ROOFTOP: 0.3    // Chi phí sân thượng tính bằng 30% diện tích sàn trệt thêm vào tổng diện tích tính tiền
        },
        COST_BREAKDOWN_RATIO: {
            ROUGH_PART: 0.6,       // Tỷ lệ chi phí phần thô trên tổng chi phí xây dựng cơ bản (Rough + Finishing)
            FINISHING_PART: 0.4,   // Tỷ lệ chi phí hoàn thiện trên tổng chi phí xây dựng cơ bản (Rough + Finishing)
            DESIGN_MANAGEMENT_PERCENTAGE: 0.1 // Tỷ lệ chi phí thiết kế & quản lý trên tổng chi phí xây dựng (trước khi tính DM)
        }
    };

    // --- KHỞI TẠO --- //
    createTableOfContents();
    addEventListeners();
    // Vô hiệu hóa nút PDF và Email khi tải trang
    downloadPdfBtn.disabled = true;
    downloadPdfBtn.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
    sendEmailLink.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');


    // --- HÀM TẠO MỤC LỤC ĐỘNG --- //
    function createTableOfContents() {
        let navHTML = '';
        sections.forEach(section => {
            const sectionId = section.id;
            const sectionTitleEl = section.querySelector('h2, h3');
            if (sectionId && sectionTitleEl) {
                const sectionTitle = sectionTitleEl.textContent.trim();
                navHTML += `<li><a href="#${sectionId}" class="nav-link block py-2 px-4 text-white hover:text-[#FBBF24] hover:bg-gray-700 rounded-md transition-colors duration-200">${sectionTitle}</a></li>`;
            }
        });
        // floatingNavList.innerHTML = navHTML; // floating-toc-menu đã bị ẩn
        sideNavList.innerHTML = navHTML; // Chỉ cập nhật sideNavList
    }

    // --- HÀM THÊM CÁC EVENT LISTENER --- //
    function addEventListeners() {
        form.addEventListener('submit', handleFormSubmit);
        sendEmailLink.addEventListener('click', handleSendEmailLink); // Đổi từ sendEmailBtn sang sendEmailLink
        downloadPdfBtn.addEventListener('click', handleDownloadPdf); // Thêm event listener cho nút tải PDF
        window.addEventListener('scroll', handleScroll);
        document.querySelectorAll('#factors-container button').forEach(button => {
            button.addEventListener('click', toggleCollapsible);
        });
        hamburgerMenuButton.addEventListener('click', openSideMenu); // Dùng openSideMenu thay vì toggle
        closeSideMenuButton.addEventListener('click', closeSideMenu); // Dùng closeSideMenu thay vì toggle
        sideMenuOverlay.addEventListener('click', closeSideMenu); // Dùng closeSideMenu thay vì toggle
        document.querySelectorAll('#side-menu a').forEach(link => {
            link.addEventListener('click', closeSideMenu); // Đóng menu khi click link
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
        customerEmail = inputs.email; // Cập nhật email khách hàng

        if (!validateInputs(inputs)) {
            setLoadingState(false);
            // Vô hiệu hóa nút email và pdf nếu validate thất bại
            sendEmailLink.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
            downloadPdfBtn.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
            return;
        }

        setTimeout(() => {
            const calculationResult = calculateCost(inputs);
            currentEstimatedCost = calculationResult.totalCost; // Cập nhật biến global
            lastCalculatedData = { inputs, calculationResult }; // Lưu trữ toàn bộ dữ liệu

            displayResults(calculationResult);
            updateMailtoLink(); // Cập nhật link mailto sau khi tính toán xong
            
            setLoadingState(false);
            // Kích hoạt lại nút PDF và Email
            sendEmailLink.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
            downloadPdfBtn.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
            
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); // Đổi block: 'center' thành 'start' để tránh che

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
        const costLoadingSpinner = document.getElementById('costLoadingSpinner'); // Lấy spinner theo ID
        if (isLoading) {
            calculateBtn.classList.add('loading');
            calculateBtn.querySelector('span').textContent = 'Đang tính toán...';
            costLoadingSpinner.classList.remove('hidden');
        } else {
            calculateBtn.classList.remove('loading');
            calculateBtn.querySelector('span').textContent = 'Ước tính Chi phí';
            costLoadingSpinner.classList.add('hidden');
        }
    }

    // --- LOGIC TÍNH TOÁN CHI PHÍ --- //
    function calculateCost(inputs) {
        const { area, floors, style, finish, foundationType, mezzanineOption, rooftopOption, roofType } = inputs;

        // Tổng diện tích tính phí (TCA - Total Calculated Area)
        let totalCalculatedArea = area; // Diện tích sàn trệt
        
        // Cộng diện tích các tầng lầu (tính 100% diện tích sàn)
        totalCalculatedArea += area * (floors - 1); 

        // Cộng thêm diện tích tầng lửng (nếu có)
        if (mezzanineOption === 'yes') {
            totalCalculatedArea += area * COST_FACTORS.AREA_MULTIPLIER.MEZZANINE;
        }
        
        // Cộng thêm diện tích sân thượng (nếu có)
        if (rooftopOption === 'yes') {
            totalCalculatedArea += area * COST_FACTORS.AREA_MULTIPLIER.ROOFTOP;
        }

        // Chi phí xây dựng trên mỗi m2 sau điều chỉnh gói hoàn thiện và phong cách
        let costPerM2 = COST_FACTORS.BASE_PER_M2[finish] * COST_FACTORS.STYLE_MULTIPLIER[style];

        // Chi phí móng (tính trên diện tích sàn trệt)
        const foundationCost = area * COST_FACTORS.FOUNDATION_PER_M2[foundationType];

        // Chi phí mái (tính trên diện tích sàn mái)
        const roofCost = area * COST_FACTORS.ROOF_PER_M2[roofType];
        
        // Tổng chi phí xây dựng trước chi phí thiết kế và quản lý
        const constructionOnlyCost = (totalCalculatedArea * costPerM2) + foundationCost + roofCost;

        // Phân bổ chi phí:
        const roughPartCost = constructionOnlyCost * COST_FACTORS.COST_BREAKDOWN_RATIO.ROUGH_PART;
        const finishingCost = constructionOnlyCost * COST_FACTORS.COST_BREAKDOWN_RATIO.FINISHING_PART;
        
        // Chi phí thiết kế & quản lý
        const designAndManagementCost = constructionOnlyCost * COST_FACTORS.COST_BREAKDOWN_RATIO.DESIGN_MANAGEMENT_PERCENTAGE;
        
        // Tổng chi phí cuối cùng
        const totalCost = roughPartCost + finishingCost + designAndManagementCost;

        return {
            totalCost: Math.round(totalCost / 1000) * 1000, // Làm tròn đến hàng nghìn
            breakdown: { // Dữ liệu cho biểu đồ bánh
                'Phần thô (Kết cấu, Móng, Mái)': roughPartCost,
                'Hoàn thiện (Sơn, Gạch, TBVS...)': finishingCost,
                'Thiết kế & Quản lý dự án': designAndManagementCost
            },
            detailedBreakdown: { // Dữ liệu cho bảng chi tiết
                'Chi phí móng': foundationCost,
                'Chi phí kết cấu & xây thô': roughPartCost - foundationCost - roofCost, // Phần còn lại của thô sau khi trừ móng và mái
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
                        <td class="px-5 py-4 text-right font-semibold text-gray-700">${formatCurrency(cost)} VNĐ</td>
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
                    <td class="px-5 py-4 text-right font-semibold text-gray-700">${formatCurrency(item.amount)} VNĐ</td>
                </tr>
            `;
        });
        paymentScheduleTableBody.innerHTML = tableHTML;
    }

    // --- XỬ LÝ GỬI EMAIL (Mailto Link) --- //
    function handleSendEmailLink(event) {
        // Ngăn chặn hành vi mặc định của thẻ <a> nếu nó không phải là mailto
        if (sendEmailLink.getAttribute('href') === '#') {
            event.preventDefault();
            showError("Vui lòng thực hiện tính toán trước khi gửi email.");
            return;
        }
        // Để mailto hoạt động bình thường, không cần preventDefault nếu href đã được set
    }

    function updateMailtoLink() {
        if (!lastCalculatedData || currentEstimatedCost === 0 || !customerEmail) {
            sendEmailLink.setAttribute('href', '#');
            sendEmailLink.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
            return;
        }

        const companyEmail = 'esb.homes.company@gmail.com';
        const subject = encodeURIComponent('Yêu cầu báo giá xây dựng nhà phố trọn gói từ website');

        const inputs = lastCalculatedData.inputs;
        const result = lastCalculatedData.calculationResult;

        const body = encodeURIComponent(
            `Kính gửi ESB Homes,\n\n` +
            `Tôi tên là [Vui lòng điền tên của bạn],\n` +
            `Email: ${inputs.email}\n\n` +
            `Tôi muốn yêu cầu báo giá chi tiết cho dự án xây dựng nhà phố với các thông tin sau:\n\n` +
            `- Diện tích sàn xây dựng: ${inputs.area} m²\n` +
            `- Số tầng: ${inputs.floors}\n` +
            `- Phong cách thiết kế: ${inputs.style}\n` +
            `- Mức độ hoàn thiện: ${inputs.finish}\n` +
            `- Loại móng: ${inputs.foundationType}\n` +
            `- Có tầng lửng: ${inputs.mezzanineOption === 'yes' ? 'Có' : 'Không'}\n` +
            `- Có sân thượng: ${inputs.rooftopOption === 'yes' ? 'Có' : 'Không'}\n` +
            `- Loại mái: ${inputs.roofType}\n\n` +
            `Chi phí ước tính sơ bộ theo công cụ của quý công ty là: ${formatCurrency(currentEstimatedCost)} VNĐ\n\n` +
            `Tôi rất mong nhận được sự tư vấn và báo giá chính xác từ quý công ty.\n\n` +
            `Xin chân thành cảm ơn!`
        );

        const mailtoLink = `mailto:${companyEmail}?subject=${subject}&body=${body}`;
        sendEmailLink.setAttribute('href', mailtoLink);
        sendEmailLink.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
    }

    // --- XỬ LÝ TẢI PDF --- //
    async function handleDownloadPdf() {
        if (!lastCalculatedData || currentEstimatedCost === 0) {
            alert('Vui lòng ước tính chi phí trước khi tải báo giá PDF.');
            return;
        }

        pdfLoadingSpinner.classList.remove('hidden');
        downloadPdfBtn.disabled = true;
        downloadPdfBtn.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4'); 

        // Khởi tạo font tiếng Việt (cần phải tải font file .ttf lên host và điều chỉnh đường dẫn)
        // Ví dụ sử dụng một font tiếng Việt phổ biến (VD: Open Sans, Noto Sans)
        // Bạn cần convert font này sang định dạng base64 hoặc nhúng trực tiếp nếu có thể
        // Hiện tại, tôi sẽ dùng font mặc định của jsPDF và chấp nhận lỗi dấu tiếng Việt nếu không có font hỗ trợ
        // Để hỗ trợ tiếng Việt đầy đủ, bạn cần một font file (ví dụ: `OpenSans-Regular.ttf`)
        // và nhúng nó vào jsPDF:
        /*
        doc.addFont('OpenSans-Regular.ttf', 'OpenSans', 'normal');
        doc.setFont('OpenSans');
        */
        // Nếu không có font tiếng Việt, các chữ có dấu sẽ bị lỗi.
        // Bạn có thể tìm các hướng dẫn chi tiết về "jsPDF custom font" để làm điều này.

        const margin = 40;
        let y = margin;
        const lineHeight = 14;
        const pageWidth = doc.internal.pageSize.getWidth();

        // Logo (tùy chọn)
        // Bạn cần có base64 của logo hoặc URL có thể truy cập CORS
        // const logoImg = 'data:image/png;base64,...'; // Thay bằng base64 của logo ESB
        // if (logoImg) {
        //     doc.addImage(logoImg, 'PNG', margin, y, 50, 50); // x, y, width, height
        //     y += 60;
        // }

        // Tiêu đề
        doc.setFontSize(22);
        doc.text("Báo Giá Xây Dựng Nhà Phố Trọn Gói (Ước Tính)", margin, y);
        y += 30;

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Ngày: ${new Date().toLocaleDateString('vi-VN')}`, pageWidth - margin, y, { align: 'right' });
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


        // Thông tin khách hàng
        doc.setFontSize(14);
        doc.text("Thông tin Khách hàng:", margin, y);
        y += lineHeight + 5;
        doc.setFontSize(12);
        doc.text(`Email: ${lastCalculatedData.inputs.email || 'Chưa cung cấp'}`, margin, y);
        y += lineHeight * 2;

        // Thông số ngôi nhà
        doc.setFontSize(14);
        doc.text("Thông số Ngôi nhà:", margin, y);
        y += lineHeight + 5;
        doc.setFontSize(12);
        doc.text(`- Diện tích sàn xây dựng: ${lastCalculatedData.inputs.area} m²`, margin, y);
        y += lineHeight;
        doc.text(`- Số tầng: ${lastCalculatedData.inputs.floors}`, margin, y);
        y += lineHeight;
        doc.text(`- Phong cách thiết kế: ${document.getElementById('style').options[document.getElementById('style').selectedIndex].text}`, margin, y);
        y += lineHeight;
        doc.text(`- Mức độ hoàn thiện: ${document.getElementById('finish').options[document.getElementById('finish').selectedIndex].text}`, margin, y);
        y += lineHeight;
        doc.text(`- Loại móng: ${document.getElementById('foundation_type').options[document.getElementById('foundation_type').selectedIndex].text}`, margin, y);
        y += lineHeight;
        doc.text(`- Có tầng lửng: ${document.getElementById('mezzanine_option').options[document.getElementById('mezzanine_option').selectedIndex].text}`, margin, y);
        y += lineHeight;
        doc.text(`- Có sân thượng: ${document.getElementById('rooftop_option').options[document.getElementById('rooftop_option').selectedIndex].text}`, margin, y);
        y += lineHeight;
        doc.text(`- Loại mái: ${document.getElementById('roof_type').options[document.getElementById('roof_type').selectedIndex].text}`, margin, y);
        y += lineHeight * 2;

        // Tổng chi phí ước tính
        doc.setFontSize(16);
        doc.setTextColor('#D97706'); 
        doc.text("TỔNG CHI PHÍ ƯỚC TÍNH TRỌN GÓI:", margin, y);
        y += lineHeight + 5;
        doc.setFontSize(20);
        doc.text(formatCurrency(currentEstimatedCost) + " VNĐ", margin, y);
        doc.setTextColor(0); // Reset color
        y += lineHeight * 2;

        doc.setFontSize(10);
        doc.text("(*Đây là ước tính sơ bộ dựa trên thông tin bạn cung cấp. Chi phí thực tế có thể thay đổi tùy thuộc vào chi tiết thiết kế, vật liệu cụ thể, điều kiện thi công và thời điểm xây dựng.)", margin, y, { maxWidth: pageWidth - 2 * margin });
        y += lineHeight * 3;

        // --- Chụp các bảng từ HTML và thêm vào PDF dưới dạng hình ảnh ---
        const sectionsToCapture = [
            document.getElementById('costBreakdownChart').closest('.mt-12'), // Phần biểu đồ
            document.getElementById('detailedBreakdownSection'), // Bảng chi tiết
            document.getElementById('paymentScheduleSection') // Lịch trình thanh toán
        ];

        // Tạm thời ẩn các nút để không xuất hiện trong PDF
        const originalButtonsDisplay = document.querySelector('.flex-col.sm\\:flex-row').style.display;
        document.querySelector('.flex-col.sm\\:flex-row').style.display = 'none';

        for (const el of sectionsToCapture) {
            if (!el) continue;

            // Đảm bảo không bị overflow khi chụp canvas
            const originalOverflow = el.style.overflow;
            el.style.overflow = 'visible';

            const canvas = await html2canvas(el, {
                scale: 2, 
                useCORS: true,
                logging: false,
                ignoreElements: (element) => {
                    return element.classList.contains('loading-spinner');
                }
            });

            el.style.overflow = originalOverflow; // Khôi phục overflow

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pageWidth - 2 * margin; 
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Kiểm tra xem có đủ chỗ trên trang hiện tại không
            if (y + imgHeight > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                y = margin; // Reset y cho trang mới
            }
            doc.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
            y += imgHeight + 20; // Thêm khoảng cách sau mỗi phần
        }

        // Hiện lại các nút
        document.querySelector('.flex-col.sm\\:flex-row').style.display = originalButtonsDisplay;

        // Tắt spinner và kích hoạt nút lại
        pdfLoadingSpinner.classList.add('hidden');
        downloadPdfBtn.disabled = false;
        downloadPdfBtn.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');

        // Lưu file PDF
        doc.save(`bao-gia-esbhomes-${lastCalculatedData.inputs.area}m2-${lastCalculatedData.inputs.floors}tang.pdf`);
    }

    // --- XỬ LÝ THANH ĐIỀU HƯỚNG VÀ CUỘN --- //
    function handleScroll() {
        let currentSectionId = '';
        // Adjusted scroll position to activate link when section is closer to top, not center
        const scrollPosition = window.scrollY + window.innerHeight * 0.3; 

        sections.forEach(section => {
            if (scrollPosition >= section.offsetTop && scrollPosition < section.offsetTop + section.offsetHeight) {
                currentSectionId = section.id;
            }
        });
        // Chỉ cập nhật active link cho side menu, floating menu đã bị ẩn
        updateActiveNavLink(currentSectionId, '#side-menu a.nav-link'); 
    }
    
    function updateActiveNavLink(activeId, selector) {
         document.querySelectorAll(selector).forEach(link => {
            link.classList.remove('active');
            // Thêm class 'active' nếu link dẫn đến activeId
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
            openContent.style.maxHeight = null; // Reset max height
            const openButton = openContent.closest('.content-card').querySelector('button');
            if(openButton) {
                const openIcon = openButton.querySelector('span');
                openIcon.textContent = '+';
                openIcon.style.transform = 'rotate(0deg)';
                openContent.style.paddingTop = '0'; // Đảm bảo padding trở về 0
                openContent.style.paddingBottom = '0'; // Đảm bảo padding trở về 0
            }
        });

        // Mở mục được click (nếu nó đang đóng)
        if (isOpening) {
            content.classList.add('open');
            content.style.maxHeight = content.scrollHeight + 'px';
            icon.textContent = '-';
            icon.style.transform = 'rotate(180deg)';
            content.style.paddingTop = '1.25rem'; // Padding đã được áp dụng trong HTML của bạn (.p-5)
            content.style.paddingBottom = '1.25rem';
        }
    }

    // --- XỬ LÝ MENU DI ĐỘNG --- //
    function openSideMenu() { // Đổi tên hàm cho rõ ràng hơn
        sideMenu.classList.remove('translate-x-full');
        sideMenu.classList.add('translate-x-0');
        sideMenuOverlay.classList.remove('hidden');
        setTimeout(() => sideMenuOverlay.classList.add('opacity-50'), 10);
        document.body.style.overflow = 'hidden';
    }

    function closeSideMenu() { // Đổi tên hàm cho rõ ràng hơn
        sideMenu.classList.remove('translate-x-0');
        sideMenu.classList.add('translate-x-full');
        sideMenuOverlay.classList.remove('opacity-50');
        setTimeout(() => sideMenuOverlay.classList.add('hidden'), 300);
        document.body.style.overflow = '';
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

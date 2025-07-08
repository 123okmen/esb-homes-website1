document.addEventListener('DOMContentLoaded', function () {
    // --- KHAI BÁO BIẾN --- //
    const form = document.getElementById('estimatorForm');
    const calculateBtn = document.getElementById('calculateBtn');
    const estimatedCostEl = document.getElementById('estimatedCost');
    const resultsSection = document.getElementById('resultsSection');
    const costErrorEl = document.getElementById('costError');
    const emailNotificationEl = document.getElementById('emailNotification');
    
    // Đã đổi từ sendEmailBtn thành sendEmailLink
    const sendEmailLink = document.getElementById('sendEmailLink'); 
    
    // Các biến cho PDF
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const pdfLoadingSpinner = document.getElementById('pdfLoadingSpinner');

    const detailedBreakdownTableBody = document.getElementById('detailedBreakdownTableBody');
    const paymentScheduleTableBody = document.getElementById('paymentScheduleTableBody');

    const sections = document.querySelectorAll('section[id]');
    const floatingNavList = document.getElementById('floating-nav-list');
    const sideNavList = document.getElementById('side-nav-list'); 

    const hamburgerMenuButton = document.getElementById('hamburger-menu-button');
    const sideMenu = document.getElementById('side-menu');
    const sideMenuOverlay = document.getElementById('side-menu-overlay');
    const closeSideMenuButton = document.getElementById('close-side-menu');
    
    const emailInput = document.getElementById('email'); 

    let costBreakdownChart = null;
    let lastCalculatedData = null; 
    let currentEstimatedCost = 0; 
    let customerEmail = ''; 

    // --- CÁC HẰNG SỐ VÀ TỶ LỆ TÍNH TOÁN --- //
    const COST_FACTORS = {
        BASE_PER_M2: {
            basic: 5000000,    
            standard: 6500000, 
            premium: 8500000   
        },
        STYLE_MULTIPLIER: {
            modern: 1.0,       
            neoclassical: 1.3, 
            minimalist: 0.95   
        },
        FOUNDATION_PER_M2: {
            simple: 250000,    
            strip: 450000,     
            pile: 1000000      
        },
        ROOF_PER_M2: {
            flat: 150000,      
            thai: 400000,      
            japanese: 500000   
        },
        AREA_MULTIPLIER: {
            MEZZANINE: 0.5, 
            ROOFTOP: 0.3    
        },
        COST_BREAKDOWN_RATIO: {
            ROUGH_PART: 0.6,       
            FINISHING_PART: 0.4,   
            DESIGN_MANAGEMENT_PERCENTAGE: 0.1 
        }
    };

    // --- KHỞI TẠO --- //
    createTableOfContents();
    addEventListeners();
    // Vô hiệu hóa nút PDF và Email khi tải trang ban đầu
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
                // Sử dụng class 'nav-link' để quản lý trạng thái active, đảm bảo nó là 'block'
                navHTML += `<li><a href="#${sectionId}" class="nav-link block py-2 px-4 text-white hover:text-[#FBBF24] hover:bg-gray-700 rounded-md transition-colors duration-200">${sectionTitle}</a></li>`;
            }
        });
        sideNavList.innerHTML = navHTML; 
    }

    // --- HÀM THÊM CÁC EVENT LISTENER --- //
    function addEventListeners() {
        form.addEventListener('submit', handleFormSubmit);
        sendEmailLink.addEventListener('click', handleSendEmailLink); 
        downloadPdfBtn.addEventListener('click', handleDownloadPdf); 
        window.addEventListener('scroll', handleScroll);
        document.querySelectorAll('#factors-container button').forEach(button => {
            button.addEventListener('click', toggleCollapsible);
        });
        hamburgerMenuButton.addEventListener('click', openSideMenu); 
        closeSideMenuButton.addEventListener('click', closeSideMenu); 
        sideMenuOverlay.addEventListener('click', closeSideMenu); 
        document.querySelectorAll('#side-menu a').forEach(link => {
            link.addEventListener('click', closeSideMenu); 
        });
    }

    // --- XỬ LÝ FORM --- //
    function handleFormSubmit(e) {
        e.preventDefault();
        // Kiểm tra xem nút đang trong trạng thái loading hay không
        if (calculateBtn.classList.contains('loading')) return;

        hideError();
        hideNotification();
        resultsSection.classList.add('hidden', 'opacity-0'); // Ẩn và làm mờ kết quả cũ
        setLoadingState(true);

        const inputs = getFormInputs();
        customerEmail = inputs.email; 

        if (!validateInputs(inputs)) {
            setLoadingState(false);
            // Vô hiệu hóa nút email và pdf nếu validate thất bại
            sendEmailLink.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed'); // Sửa lỗi cú pháp .add
            downloadPdfBtn.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed'); // Sửa lỗi cú pháp .add
            return;
        }

        setTimeout(() => {
            const calculationResult = calculateCost(inputs);
            currentEstimatedCost = calculationResult.totalCost; 
            lastCalculatedData = { inputs, calculationResult }; 

            displayResults(calculationResult);
            updateMailtoLink(); 
            
            setLoadingState(false);
            // Kích hoạt lại nút PDF và Email sau khi tính toán xong
            sendEmailLink.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
            downloadPdfBtn.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
            
            // Cuộn đến phần kết quả
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); 

        }, 1500); // Giả lập độ trễ
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
        const costLoadingSpinner = document.getElementById('costLoadingSpinner'); 
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

        let totalCalculatedArea = area; 
        
        totalCalculatedArea += area * (floors - 1); 

        if (mezzanineOption === 'yes') {
            totalCalculatedArea += area * COST_FACTORS.AREA_MULTIPLIER.MEZZANINE;
        }
        
        if (rooftopOption === 'yes') {
            totalCalculatedArea += area * COST_FACTORS.AREA_MULTIPLIER.ROOFTOP;
        }

        let costPerM2 = COST_FACTORS.BASE_PER_M2[finish] * COST_FACTORS.STYLE_MULTIPLIER[style];

        const foundationCost = area * COST_FACTORS.FOUNDATION_PER_M2[foundationType];

        const roofCost = area * COST_FACTORS.ROOF_PER_M2[roofType];
        
        const constructionOnlyCost = (totalCalculatedArea * costPerM2) + foundationCost + roofCost;

        const roughPartCost = constructionOnlyCost * COST_FACTORS.COST_BREAKDOWN_RATIO.ROUGH_PART;
        const finishingCost = constructionOnlyCost * COST_FACTORS.COST_BREAKDOWN_RATIO.FINISHING_PART;
        
        const designAndManagementCost = constructionOnlyCost * COST_FACTORS.COST_BREAKDOWN_RATIO.DESIGN_MANAGEMENT_PERCENTAGE;
        
        const totalCost = roughPartCost + finishingCost + designAndManagementCost;

        return {
            totalCost: Math.round(totalCost / 1000) * 1000, 
            breakdown: { 
                'Phần thô (Kết cấu, Móng, Mái)': roughPartCost,
                'Hoàn thiện (Sơn, Gạch, TBVS...)': finishingCost,
                'Thiết kế & Quản lý dự án': designAndManagementCost
            },
            detailedBreakdown: { 
                'Chi phí móng': foundationCost,
                'Chi phí kết cấu & xây thô': roughPartCost - foundationCost - roofCost, 
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
        if (sendEmailLink.getAttribute('href') === '#') {
            event.preventDefault(); // Ngăn chặn nếu href chưa được set
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
        // const result = lastCalculatedData.calculationResult; // Không cần dùng trực tiếp ở đây nữa

        const body = encodeURIComponent(
            `Kính gửi ESB Homes,\n\n` +
            `Tôi tên là [Vui lòng điền tên của bạn],\n` +
            `Email: ${inputs.email}\n\n` +
            `Tôi muốn yêu cầu báo giá chi tiết cho dự án xây dựng nhà phố với các thông tin sau:\n\n` +
            `- Diện tích sàn xây dựng: ${inputs.area} m²\n` +
            `- Số tầng: ${inputs.floors}\n` +
            `- Phong cách thiết kế: ${document.getElementById('style').options[document.getElementById('style').selectedIndex].text}\n` +
            `- Mức độ hoàn thiện: ${document.getElementById('finish').options[document.getElementById('finish').selectedIndex].text}\n` +
            `- Loại móng: ${document.getElementById('foundation_type').options[document.getElementById('foundation_type').selectedIndex].text}\n` +
            `- Có tầng lửng: ${document.getElementById('mezzanine_option').options[document.getElementById('mezzanine_option').selectedIndex].text}\n` +
            `- Có sân thượng: ${document.getElementById('rooftop_option').options[document.getElementById('rooftop_option').selectedIndex].text}\n` +
            `- Loại mái: ${document.getElementById('roof_type').options[document.getElementById('roof_type').selectedIndex].text}\n\n` +
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

        // Sửa cách gọi jsPDF
        const { jsPDF } = window.jspdf; // jsPDF UMD module exports default as jspdf, but common usage is { jsPDF }
        const doc = new jsPDF('p', 'pt', 'a4'); 

        // Khởi tạo font tiếng Việt (cần phải tải font file .ttf lên host và điều chỉnh đường dẫn)
        // Đây là bước quan trọng nhất để hiển thị tiếng Việt có dấu trong PDF.
        // Nếu không có font tiếng Việt, các chữ có dấu sẽ bị lỗi.
        // Bạn cần tải một font hỗ trợ tiếng Việt (ví dụ: Noto Sans, Roboto)
        // và nhúng nó vào jsPDF. Ví dụ:
        /*
        doc.addFont('path/to/your/vietnamese-font.ttf', 'VietnameseFont', 'normal');
        doc.setFont('VietnameseFont');
        */
        // Hoặc sử dụng jsPDF-AutoTable with fonts if using tables
        // For simple text, you might be able to use:
        // doc.setFont('Helvetica'); // Or 'Times-Roman' which is usually embedded
        // doc.text can sometimes handle basic ASCII, but for full Vietnamese, custom fonts are critical.

        const margin = 40;
        let y = margin;
        const pageWidth = doc.internal.pageSize.getWidth();

        // Tiêu đề
        doc.setFontSize(22);
        doc.text("Báo Giá Xây Dựng Nhà Phố Trọn Gói (Ước Tính)", margin, y);
        y += 30;

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Ngày: ${new Date().toLocaleDateString('vi-VN')}`, pageWidth - margin, y, { align: 'right' });
        doc.setTextColor(0); 
        y += 20;

        // Thông tin công ty
        doc.setFontSize(12);
        doc.text("ESB Homes - Eco-Smart-Build", margin, y);
        y += 14; // lineHeight
        doc.text("Địa chỉ: 14A Đường số 21, Phường Tân Quy, Quận 7, TP. Hồ Chí Minh", margin, y);
        y += 14;
        doc.text("Hotline: 0899618286", margin, y);
        y += 14 * 2;


        // Thông tin khách hàng
        doc.setFontSize(14);
        doc.text("Thông tin Khách hàng:", margin, y);
        y += 14 + 5;
        doc.setFontSize(12);
        doc.text(`Email: ${lastCalculatedData.inputs.email || 'Chưa cung cấp'}`, margin, y);
        y += 14 * 2;

        // Thông số ngôi nhà
        doc.setFontSize(14);
        doc.text("Thông số Ngôi nhà:", margin, y);
        y += 14 + 5;
        doc.setFontSize(12);
        // Lấy lại text từ option để có giá trị hiển thị đầy đủ
        doc.text(`- Diện tích sàn xây dựng: ${lastCalculatedData.inputs.area} m²`, margin, y);
        y += 14;
        doc.text(`- Số tầng: ${lastCalculatedData.inputs.floors}`, margin, y);
        y += 14;
        doc.text(`- Phong cách thiết kế: ${document.getElementById('style').options[document.getElementById('style').selectedIndex].text}`, margin, y);
        y += 14;
        doc.text(`- Mức độ hoàn thiện: ${document.getElementById('finish').options[document.getElementById('finish').selectedIndex].text}`, margin, y);
        y += 14;
        doc.text(`- Loại móng: ${document.getElementById('foundation_type').options[document.getElementById('foundation_type').selectedIndex].text}`, margin, y);
        y += 14;
        doc.text(`- Có tầng lửng: ${document.getElementById('mezzanine_option').options[document.getElementById('mezzanine_option').selectedIndex].text}`, margin, y);
        y += 14;
        doc.text(`- Có sân thượng: ${document.getElementById('rooftop_option').options[document.getElementById('rooftop_option').selectedIndex].text}`, margin, y);
        y += 14;
        doc.text(`- Loại mái: ${document.getElementById('roof_type').options[document.getElementById('roof_type').selectedIndex].text}`, margin, y);
        y += 14 * 2;

        // Tổng chi phí ước tính
        doc.setFontSize(16);
        doc.setTextColor('#D97706'); 
        doc.text("TỔNG CHI PHÍ ƯỚC TÍNH TRỌN GÓI:", margin, y);
        y += 14 + 5;
        doc.setFontSize(20);
        doc.text(formatCurrency(currentEstimatedCost) + " VNĐ", margin, y);
        doc.setTextColor(0); 
        y += 14 * 2;

        doc.setFontSize(10);
        doc.text("(*Đây là ước tính sơ bộ dựa trên thông tin bạn cung cấp. Chi phí thực tế có thể thay đổi tùy thuộc vào chi tiết thiết kế, vật liệu cụ thể, điều kiện thi công và thời điểm xây dựng.)", margin, y, { maxWidth: pageWidth - 2 * margin });
        y += 14 * 3;

        // --- Chụp các bảng từ HTML và thêm vào PDF dưới dạng hình ảnh ---
        const sectionsToCapture = [
            document.getElementById('costBreakdownChart').closest('.mt-12'), 
            document.getElementById('detailedBreakdownSection'), 
            document.getElementById('paymentScheduleSection') 
        ];

        // Tạm thời ẩn các nút để không xuất hiện trong PDF
        const buttonsDiv = document.querySelector('.flex-col.sm\\:flex-row'); 
        let originalButtonsDisplay = '';
        if (buttonsDiv) {
            originalButtonsDisplay = buttonsDiv.style.display;
            buttonsDiv.style.display = 'none'; 
        }

        // Tạm thời ẩn các element cố định khác có thể bị chụp
        const tempHideElements = [
            document.getElementById('hamburger-menu-button'),
            document.getElementById('side-menu'),
            document.getElementById('side-menu-overlay'),
            // floating-toc-menu đã ẩn bằng CSS
        ];
        tempHideElements.forEach(el => el && (el.style.display = 'none'));

        for (const el of sectionsToCapture) {
            if (!el) continue;

            const originalOverflow = el.style.overflow;
            el.style.overflow = 'visible';
            
            // Tăng scale để chất lượng ảnh tốt hơn trong PDF
            const canvas = await html2canvas(el, {
                scale: 2, 
                useCORS: true,
                logging: false, // Tắt logging để console không bị tràn
                ignoreElements: (element) => {
                    return element.classList.contains('loading-spinner');
                }
            });

            el.style.overflow = originalOverflow; 

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pageWidth - 2 * margin; 
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (y + imgHeight > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                y = margin; 
            }
            doc.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
            y += imgHeight + 20; 
        }

        // Hiện lại các nút và element đã ẩn
        if (buttonsDiv) {
            buttonsDiv.style.display = originalButtonsDisplay;
        }
        tempHideElements.forEach(el => el && (el.style.display = ''));

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
        const scrollPosition = window.scrollY + window.innerHeight * 0.3; 

        sections.forEach(section => {
            if (scrollPosition >= section.offsetTop && scrollPosition < section.offsetTop + section.offsetHeight) {
                currentSectionId = section.id;
            }
        });
        updateActiveNavLink(currentSectionId, '#side-menu a.nav-link'); 
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
            openContent.style.maxHeight = null; 
            const openButton = openContent.closest('.content-card').querySelector('button');
            if(openButton) {
                const openIcon = openButton.querySelector('span');
                openIcon.textContent = '+';
                openIcon.style.transform = 'rotate(0deg)';
                openContent.style.paddingTop = '0'; 
                openContent.style.paddingBottom = '0'; 
            }
        });

        // Mở mục được click (nếu nó đang đóng)
        if (isOpening) {
            content.classList.add('open');
            content.style.maxHeight = content.scrollHeight + 'px';
            icon.textContent = '-';
            icon.style.transform = 'rotate(180deg)';
            content.style.paddingTop = '1.25rem'; 
            content.style.paddingBottom = '1.25rem';
        }
    }

    // --- XỬ LÝ MENU DI ĐỘNG --- //
    function openSideMenu() { 
        sideMenu.classList.remove('translate-x-full');
        sideMenu.classList.add('translate-x-0');
        sideMenuOverlay.classList.remove('hidden');
        setTimeout(() => sideMenuOverlay.classList.add('opacity-50'), 10);
        document.body.style.overflow = 'hidden';
    }

    function closeSideMenu() { 
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

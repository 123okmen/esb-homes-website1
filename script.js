document.addEventListener('DOMContentLoaded', function () {
    // --- KHAI BÁO BIẾN --- //
    const form = document.getElementById('estimatorForm');
    const calculateBtn = document.getElementById('calculateBtn');
    const estimatedCostEl = document.getElementById('estimatedCost');
    const resultsSection = document.getElementById('resultsSection');
    const costErrorEl = document.getElementById('costError');
    const emailNotificationEl = document.getElementById('emailNotification');
    
    const sendEmailLink = document.getElementById('sendEmailLink'); 
    
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
    const phoneInput = document.getElementById('phone'); 

    const toggleFloatingTocButton = document.getElementById('toggle-floating-toc-button');
    const floatingTocMenu = document.getElementById('floating-toc-menu');

    let costBreakdownChart = null;
    let lastCalculatedData = null; 
    let currentEstimatedCost = 0; 
    let customerEmail = ''; 
    let customerPhone = ''; 

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
        FOUNDATION_PERCENTAGES: { 
            simple: 0.40, 
            strip: 0.60,   
            pile: 0.50     
        },
        ROOF_PER_M2: {
            flat: (1400000 + 1950000) / 2 + (100000 + 150000) / 2, 
            thai: (350000 + 450000) / 2 + (150000 + 200000) / 2, 
            japanese: (650000 + 1000000) / 2 + (150000 + 200000) / 2 
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
    downloadPdfBtn.disabled = true;
    downloadPdfBtn.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
    sendEmailLink.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');


    // --- HÀM TIỆN ÍCH CHUYỂN ĐỔI TIẾNG VIỆT CÓ DẤU SANG KHÔNG DẤU ---
    function removeAccents(str) {
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D");
    }

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
        floatingNavList.innerHTML = navHTML; 
        sideNavList.innerHTML = navHTML; 
    }

    // --- HÀM THÊM CÁC EVENT LISTENER --- //
    function addEventListeners() {
        form.addEventListener('submit', handleFormSubmit);
        sendEmailLink.addEventListener('click', handleSendEmailLink); 
        downloadPdfBtn.addEventListener('click', handleDownloadPdf); 
        window.addEventListener('scroll', handleScroll);
        // ĐÃ XÓA: Event listener cho các nút toggle của phần "Yếu tố ảnh hưởng"
        /*
        document.querySelectorAll('#factors-container button').forEach(button => {
            button.addEventListener('click', toggleCollapsible);
        });
        */
        hamburgerMenuButton.addEventListener('click', openSideMenu); 
        closeSideMenuButton.addEventListener('click', closeSideMenu); 
        sideMenuOverlay.addEventListener('click', closeSideMenu); 
        document.querySelectorAll('#side-menu a.nav-link').forEach(link => { 
            link.addEventListener('click', closeSideMenu); 
        });
        if (toggleFloatingTocButton) {
            toggleFloatingTocButton.addEventListener('click', toggleFloatingToc);
        }
    }

    // --- XỬ LÝ FORM --- //
    async function handleFormSubmit(e) { 
        e.preventDefault();
        if (calculateBtn.classList.contains('loading')) return;

        hideError();
        hideNotification();
        resultsSection.classList.add('hidden', 'opacity-0'); 
        setLoadingState(true);

        const inputs = getFormInputs();
        customerEmail = inputs.email; 
        customerPhone = inputs.phone; 

        if (!validateInputs(inputs)) {
            setLoadingState(false);
            sendEmailLink.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed'); 
            downloadPdfBtn.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed'); 
            return;
        }

        setTimeout(async () => { 
            const calculationResult = calculateCost(inputs);
            currentEstimatedCost = calculationResult.totalCost; 
            lastCalculatedData = { inputs, calculationResult }; 

            displayResults(calculationResult);
            updateMailtoLink(); 
            
            setLoadingState(false);
            sendEmailLink.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
            downloadPdfBtn.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed'); 

            await handleDownloadPdf(); 
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); 

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
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim() 
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
        const phonePattern = /^[0-9]{10,11}$/; 
        if (!inputs.phone || !phonePattern.test(inputs.phone)) {
            showError('Vui lòng nhập số điện thoại hợp lệ (10 hoặc 11 chữ số).');
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

        const coreBuildingCost = totalCalculatedArea * COST_FACTORS.BASE_PER_M2[finish] * COST_FACTORS.STYLE_MULTIPLIER[style];

        const foundationCost = coreBuildingCost * COST_FACTORS.FOUNDATION_PERCENTAGES[foundationType];

        const roofCost = area * COST_FACTORS.ROOF_PER_M2[roofType];
        
        const roughPartCore = coreBuildingCost * COST_FACTORS.COST_BREAKDOWN_RATIO.ROUGH_PART;
        const finishingPartCore = coreBuildingCost * COST_FACTORS.COST_BREAKDOWN_RATIO.FINISHING_PART;
        
        const subTotalBeforeDesign = roughPartCore + finishingPartCore + foundationCost + roofCost;

        const designAndManagementCost = subTotalBeforeDesign * COST_FACTORS.COST_BREAKDOWN_RATIO.DESIGN_MANAGEMENT_PERCENTAGE;
        
        const totalCost = subTotalBeforeDesign + designAndManagementCost;

        return {
            totalCost: Math.round(totalCost / 1000) * 1000, 
            breakdown: { 
                'Phần thô (Kết cấu, Móng, Mái)': roughPartCore + foundationCost + roofCost, 
                'Hoàn thiện (Sơn, Gạch, TBVS...)': finishingPartCore,
                'Thiết kế & Quản lý dự án': designAndManagementCost
            },
            detailedBreakdown: { 
                'Chi phí móng': foundationCost,
                'Chi phí kết cấu & xây thô': roughPartCore, 
                'Chi phí mái': roofCost,
                'Chi phí hoàn thiện': finishingPartCore,
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

        for (const mainCategoryKey in mainCategories) { 
            const subItemKeys = mainCategories[mainCategoryKey];
            subItemKeys.forEach((itemKey, index) => { 
                const cost = detailedData[itemKey] || 0; 
                tableHTML += `
                    <tr class="border-t border-gray-200">
                        ${index === 0 ? `<td class="px-5 py-4 font-medium text-gray-800 align-top" rowspan="${subItemKeys.length}">${mainCategoryKey}</td>` : ''}
                        <td class="px-5 py-4 text-gray-600">${itemKey}</td>
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
        if (sendEmailLink.classList.contains('disabled:opacity-50')) {
            event.preventDefault(); 
            showError("Vui lòng ước tính chi phí trước khi gửi email."); 
            return;
        }
    }

    function updateMailtoLink() {
        if (!lastCalculatedData || currentEstimatedCost === 0 || !customerEmail || !customerPhone) { 
            sendEmailLink.setAttribute('href', '#');
            sendEmailLink.classList.add('disabled:opacity-50', 'disabled:cursor-not-allowed');
            return;
        }

        const companyEmail = 'esb.homes.company@gmail.com';
        const subject = encodeURIComponent('Yêu cầu báo giá xây dựng nhà phố trọn gói từ website'); 

        const inputs = lastCalculatedData.inputs;

        const styleText = document.getElementById('style').options[document.getElementById('style').selectedIndex].text;
        const finishText = document.getElementById('finish').options[document.getElementById('finish').selectedIndex].text;
        const foundationTypeText = document.getElementById('foundation_type').options[document.getElementById('foundation_type').selectedIndex].text;
        const mezzanineOptionText = document.getElementById('mezzanine_option').options[document.getElementById('mezzanine_option').selectedIndex].text;
        const rooftopOptionText = document.getElementById('rooftop_option').options[document.getElementById('rooftop_option').selectedIndex].text;
        const roofTypeText = document.getElementById('roof_type').options[document.getElementById('roof_type').selectedIndex].text;


        const body = encodeURIComponent(
            `Kính gửi ESB Homes,\n\n` + 
            `Tôi tên là [Vui lòng điền tên của bạn],\n` + 
            `Email: ${inputs.email}\n` + 
            `Số điện thoại: ${inputs.phone}\n\n` + 
            `Tôi muốn yêu cầu báo giá chi tiết cho dự án xây dựng nhà phố với các thông tin sau:\n\n` + 
            `- Diện tích sàn xây dựng: ${inputs.area} m²\n` + 
            `- Số tầng: ${inputs.floors}\n` + 
            `- Phong cách thiết kế: ${styleText} (đã chọn)\n` + 
            `- Mức độ hoàn thiện: ${finishText} (đã chọn)\n` + 
            `- Loại móng: ${foundationTypeText} (đã chọn)\n` + 
            `- Có tầng lửng: ${mezzanineOptionText} (đã chọn)\n` + 
            `- Có sân thượng: ${rooftopOptionText} (đã chọn)\n` + 
            `- Loại mái: ${roofTypeText} (đã chọn)\n\n` + 
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

        const margin = 40; 
        let y = margin; 
        const lineHeight = 14; 
        const pageWidth = doc.internal.pageSize.getWidth(); 

        doc.setFontSize(22); 
        doc.text("ESB Homes", margin, y); 
        doc.setFontSize(10); 
        doc.text("Eco-Smart-Build", margin, y + 15); 
        y += 40; 

        doc.setFontSize(18); 
        doc.text(removeAccents("BAO GIA XAY DUNG NHA PHO (UOC TINH SO BO)"), pageWidth / 2, y, { align: 'center' }); 
        y += 25; 
        doc.setFontSize(10); 
        doc.text(removeAccents(`Ngay lap: ${new Date().toLocaleDateString('vi-VN')}`), pageWidth - margin, y, { align: 'right' }); 
        y += 20; 

        doc.setFontSize(12); 
        doc.text(removeAccents("Cong ty ESB Homes"), margin, y); 
        y += lineHeight; 
        doc.text(removeAccents("Dia chi: 14A Duong so 21, Phuong Tan Quy, Quan 7, TP. Ho Chi Minh"), margin, y); 
        y += lineHeight; 
        doc.text(removeAccents("Hotline: 0899618286"), margin, y); 
        y += lineHeight * 2; 

        doc.setFontSize(12); 
        doc.text(removeAccents("Thong tin lien he:"), margin, y); 
        y += lineHeight; 
        doc.text(removeAccents(`Email: ${lastCalculatedData.inputs.email || 'Chua cung cap'}`), margin, y); 
        y += lineHeight; 
        doc.text(removeAccents(`So dien thoai: ${lastCalculatedData.inputs.phone || 'Chua cung cap'}`), margin, y); 
        y += lineHeight * 2; 

        doc.setFontSize(14); 
        doc.text(removeAccents("BANG CHI TIET HANG MUC (UOC TINH)"), margin, y); 
        y += lineHeight + 10; 

        const detailedData = lastCalculatedData.calculationResult.detailedBreakdown; 
        const mainCategoriesForPdf = { 
            'Phần Thô': ['Chi phí móng', 'Chi phí kết cấu & xây thô', 'Chi phí mái'], 
            'Hoàn Thiện': ['Chi phí hoàn thiện'], 
            'Chi phí khác': ['Chi phí thiết kế & quản lý'] 
        };

        const detailedTableHeaders = [[removeAccents('Hang muc chinh'), removeAccents('Hang muc chi tiet'), removeAccents('Chi phi (VND)')]]; 
        const detailedTableBody = [];

        for (const mainCategoryKey in mainCategoriesForPdf) { 
            const subItemKeys = mainCategoriesForPdf[mainCategoryKey];
            subItemKeys.forEach((itemKey, index) => { 
                const cost = detailedData[itemKey] || 0; 
                detailedTableBody.push([
                    index === 0 ? removeAccents(mainCategoryKey) : '', 
                    removeAccents(itemKey), 
                    `${formatCurrency(cost)} VNĐ` 
                ]);
            });
        }
        
        doc.autoTable({
            startY: y, 
            head: detailedTableHeaders, 
            body: detailedTableBody, 
            theme: 'grid', 
            styles: {
                font: 'helvetica', 
                fontSize: 10, 
                cellPadding: 5, 
                lineColor: '#e0e0e0', 
                lineWidth: 0.5
            },
            headStyles: {
                fillColor: '#FBBF24', 
                textColor: '#1F2937', 
                fontStyle: 'bold', 
                halign: 'center' 
            },
            bodyStyles: {
                textColor: '#1F2937', 
                valign: 'middle' 
            },
            columnStyles: {
                0: { cellWidth: 100 }, 
                1: { cellWidth: 180 }, 
                2: { cellWidth: 120, halign: 'right' } 
            },
            didDrawPage: function(data) {
                // You can add page numbers or footers here
            }
        });

        y = doc.autoTable.previous.finalY + 20; 

        doc.setFontSize(14); 
        doc.text(removeAccents("BANG LICH TRINH THANH TOAN"), margin, y); 
        y += lineHeight + 10; 

        const paymentScheduleData = lastCalculatedData.calculationResult.paymentSchedule;
        const paymentTableHeaders = [[removeAccents('Dot'), removeAccents('Noi dung'), removeAccents('Ty le'), removeAccents('So tien (VND)')]];
        const paymentTableBody = [];

        paymentScheduleData.forEach(item => {
            paymentTableBody.push([
                removeAccents(item.phase),
                removeAccents(item.task),
                `${(item.rate * 100).toFixed(0)}%`,
                `${formatCurrency(item.amount)} VNĐ`
            ]);
        });

        doc.autoTable({
            startY: y,
            head: paymentTableHeaders,
            body: paymentTableBody,
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 10,
                cellPadding: 5,
                lineColor: '#e0e0e0',
                lineWidth: 0.5
            },
            headStyles: {
                fillColor: '#FBBF24',
                textColor: '#1F2937',
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: {
                textColor: '#1F2937',
                valign: 'top'
            },
            columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: 220 },
                2: { cellWidth: 60, halign: 'right' }, 
                3: { cellWidth: 120, halign: 'right' } 
            },
            didDrawPage: function(data) {
                // You can add page numbers or footers here
            }
        });

        y = doc.autoTable.previous.finalY + 20;

        doc.setFontSize(16); 
        doc.setTextColor('#D97706'); 
        doc.text(removeAccents("TONG CHI PHI UOC TINH SO BO:"), margin, y); 
        y += lineHeight + 5; 
        doc.setFontSize(20); 
        doc.text(formatCurrency(currentEstimatedCost) + " VND", margin, y); 
        doc.setTextColor(0); 
        y += lineHeight * 2; 
        
        doc.setFontSize(12);
        doc.text(removeAccents("Vui long lien he qua hotline va Zalo cua cong ty de biet them chi tiet."), margin, y, { maxWidth: pageWidth - 2 * margin }); 
        y += lineHeight * 2;


        doc.setFontSize(14); 
        doc.text(removeAccents("De nhan bao gia chinh xac nhat va tu van chi tiet hon,"), margin, y, { maxWidth: pageWidth - 2 * margin }); 
        y += lineHeight + 5; 
        doc.setFontSize(12); 
        doc.text(removeAccents("vui long lien he ESB Homes qua:"), margin, y, { maxWidth: pageWidth - 2 * margin }); 
        y += lineHeight * 2; 
        doc.setFontSize(14); 
        doc.setTextColor('#FBBF24'); 
        doc.text("Hotline: 0899618286", margin, y); 
        y += lineHeight; 
        doc.text("Email: esb.homes.company@gmail.com", margin, y); 
        y += lineHeight; 
        doc.text("Zalo: 0772 634 611", margin, y); 
        doc.setTextColor(0); 
        y += lineHeight * 2; 
        
        doc.setFontSize(10); 
        doc.text(removeAccents("(*Bao gia nay chi mang tinh chat tham khao. Chi phi thuc te co the thay doi tuy thuoc vao yeu cau cu the.)"), margin, y, { maxWidth: pageWidth - 2 * margin }); 

        pdfLoadingSpinner.classList.add('hidden'); 
        downloadPdfBtn.disabled = false; 
        downloadPdfBtn.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed'); 

        doc.save(removeAccents(`bao-gia-esbhomes-uoc-tinh-${lastCalculatedData.inputs.area}m2-${lastCalculatedData.inputs.floors}tang.pdf`)); 
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
        updateActiveNavLink(currentSectionId, '.nav-link'); 
    }
    
    function updateActiveNavLink(activeId, selector) {
        document.querySelectorAll(selector).forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${activeId}`) {
                link.classList.add('active');
            }
        });
    }

    // ĐÃ XÓA: Hàm toggleCollapsible vì không còn collapsible content
    /*
    function toggleCollapsible(event) {
        const button = event.currentTarget;
        const content = button.nextElementSibling.querySelector('.collapsible-content');
        const icon = button.querySelector('span');
        
        const isOpening = !content.classList.contains('open');

        document.querySelectorAll('.collapsible-content.open').forEach(openContent => {
            openContent.classList.remove('open');
            openContent.style.maxHeight = null; 
            openContent.style.paddingTop = '0'; 
            openContent.style.paddingBottom = '0'; 
            const openButton = openContent.closest('.content-card').querySelector('button');
            if(openButton) {
                const openIcon = openButton.querySelector('span');
                openIcon.textContent = '+';
                openIcon.style.transform = 'rotate(0deg)';
            }
        });

        if (isOpening) {
            content.classList.add('open');
            void content.offsetWidth; 
            content.style.maxHeight = content.scrollHeight + 'px'; 
            icon.textContent = '-'; 
            icon.style.transform = 'rotate(180deg)'; 
            content.style.paddingTop = '1.25rem'; 
            content.style.paddingBottom = '1.25rem';
        }
    }
    */

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

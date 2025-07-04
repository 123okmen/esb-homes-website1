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
    const ctxCostBreakdown = document.getElementById('costBreakdownChart').getContext('2d');

    let lastQuoteData = null;

    let costBreakdownChart = new Chart(ctxCostBreakdown, {
        type: 'bar',
        data: {
            labels: ['Phần thô', 'Hoàn thiện', 'M&E', 'Thiết kế & Giấy phép', 'Dự phòng'],
            datasets: [{
                label: 'Phân bổ Chi phí',
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    'rgba(251, 191, 36, 0.7)', /* Golden Yellow */
                    'rgba(245, 158, 11, 0.7)',  /* Orange-Yellow */
                    'rgba(217, 119, 6, 0.7)',   /* Darker Orange */
                    'rgba(180, 83, 9, 0.7)',    /* Brownish Orange */
                    'rgba(124, 45, 6, 0.7)'     /* Darkest Orange */
                ],
                borderColor: [
                    'rgb(251, 191, 36)',
                    'rgb(245, 158, 11)',
                    'rgb(217, 119, 6)',
                    'rgb(180, 83, 9)',
                    'rgb(124, 45, 6)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Tỷ lệ (%)',
                        color: '#3a3a3a'
                    },
                    ticks: {
                        color: '#3a3a3a'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        callback: function(value, index, values) {
                            const label = this.getLabelForValue(value);
                            if (label.length > 16) {
                                return label.split(' ').reduce((acc, word) => {
                                    if (acc[acc.length - 1].length + word.length + 1 > 16) {
                                        acc.push(word);
                                    } else {
                                        acc[acc.length - 1] += (acc[acc.length - 1] ? ' ' : '') + word;
                                    }
                                    return acc;
                                }, ['']);
                            }
                            return label;
                        },
                        color: '#3a3a3a'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y + '%';
                            }
                            return label;
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'PHÂN BỔ CHI PHÍ ƯỚC TÍNH (TỶ LỆ PHẦN TRĂM)',
                    font: { size: 16, family: 'Arial', color: '#3a3a3a' }
                }
            }
        }
    });

    estimatorForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const area = parseFloat(areaInput.value);
        const floors = parseInt(floorsInput.value);
        const email = emailInput.value;

        if (isNaN(area) || area <= 0 || isNaN(floors) || floors <= 0) {
            costError.textContent = 'Vui lòng nhập diện tích và số tầng hợp lệ.';
            costError.classList.remove('hidden');
            emailNotification.classList.add('hidden');
            resultsSection.classList.add('hidden');
            costLoadingSpinner.classList.add('hidden'); // Ensure spinner is hidden on error
            return;
        } else {
            costError.classList.add('hidden');
        }

        costLoadingSpinner.classList.remove('hidden'); // Show spinner
        resultsSection.classList.add('hidden');
        emailNotification.classList.add('hidden');

        setTimeout(() => {
            const style = styleSelect.value;
            const finish = finishSelect.value;
            const foundationType = foundationTypeSelect.value;
            const mezzanineOption = mezzanineOptionSelect.value;
            const rooftopOption = rooftopOptionSelect.value;
            const roofType = roofTypeSelect.value;

            let baseCostPerSqM = 5000000;

            if (style === 'neoclassical') baseCostPerSqM *= 1.2;
            else if (style === 'minimalist') baseCostPerSqM *= 0.95;

            if (finish === 'standard') baseCostPerSqM *= 1.15;
            else if (finish === 'premium') baseCostPerSqM *= 1.35;

            let floorFactor = 1;
            if (floors === 2) floorFactor = 1.05;
            else if (floors === 3) floorFactor = 1.1;
            else if (floors === 4) floorFactor = 1.15;
            else if (floors > 4) floorFactor = 1.2;

            let foundationFactor = 1;
            if (foundationType === 'strip') foundationFactor = 1.05;
            else if (foundationType === 'pile') foundationFactor = 1.10;
            
            let mezzanineFactor = (mezzanineOption === 'yes') ? 1.03 : 1;
            
            let rooftopFactor = (rooftopOption === 'yes') ? 1.02 : 1;

            let roofFactor = 1;
            if (roofType === 'thai') roofFactor = 1.05;
            else if (roofType === 'japanese') roofFactor = 1.07;
            
            const totalArea = area * floors;
            const totalEstimatedCost = totalArea * baseCostPerSqM * floorFactor * foundationFactor * mezzanineFactor * rooftopFactor * roofFactor;

            lastQuoteData = {
                area,
                floors,
                style: styleSelect.options[styleSelect.selectedIndex].text,
                finish: finishSelect.options[finishSelect.selectedIndex].text,
                foundationType: foundationTypeSelect.options[foundationTypeSelect.selectedIndex].text,
                mezzanineOption: mezzanineOptionSelect.options[mezzanineOptionSelect.selectedIndex].text,
                rooftopOption: rooftopOptionSelect.options[rooftopOptionSelect.selectedIndex].text,
                roofType: roofTypeSelect.options[roofTypeSelect.selectedIndex].text,
                email,
                totalEstimatedCost
            };

            estimatedCostDisplay.textContent = `${totalEstimatedCost.toLocaleString('vi-VN')} VNĐ`;
            
            const breakdownPercentages = {
                'basic':    { rough: 40, finishing: 30, me: 15, design: 10, contingency: 5 },
                'standard': { rough: 35, finishing: 35, me: 15, design: 10, contingency: 5 },
                'premium':  { rough: 30, finishing: 40, me: 15, design: 10, contingency: 5 }
            };
            const currentBreakdownPercents = breakdownPercentages[finish];
            
            costBreakdownChart.data.datasets[0].data = Object.values(currentBreakdownPercents);
            costBreakdownChart.update();

            const detailedItems = {
                'Phần thô': {
                    'Móng, kết cấu': 0.60 * currentBreakdownPercents.rough,
                    'Xây tô, chống thấm': 0.40 * currentBreakdownPercents.rough
                },
                'Hoàn thiện': {
                    'Ốp lát (sàn, tường)': 0.30 * currentBreakdownPercents.finishing,
                    'Sơn nước, trần thạch cao': 0.25 * currentBreakdownPercents.finishing,
                    'Cửa, lan can, cầu thang': 0.25 * currentBreakdownPercents.finishing,
                    'Thiết bị vệ sinh': 0.20 * currentBreakdownPercents.finishing
                },
                'Hệ thống M&E': {
                    'Hệ thống điện': 0.50 * currentBreakdownPercents.me,
                    'Hệ thống cấp thoát nước': 0.50 * currentBreakdownPercents.me
                },
                'Chi phí khác': {
                    'Thiết kế & Giấy phép': currentBreakdownPercents.design,
                    'Dự phòng': currentBreakdownPercents.contingency
                }
            };

            detailedBreakdownTableBody.innerHTML = '';
            for (const mainCategory in detailedItems) {
                let firstRow = true;
                const subItems = detailedItems[mainCategory];
                const rowSpan = Object.keys(subItems).length;
                for (const subItem in subItems) {
                    const cost = totalEstimatedCost * (subItems[subItem] / 100);
                    const row = document.createElement('tr');
                    let mainCategoryCell = '';
                    if (firstRow) {
                        mainCategoryCell = `<td rowspan="${rowSpan}" class="align-top font-semibold">${mainCategory}</td>`;
                        firstRow = false;
                    }
                    row.innerHTML = `
                        ${mainCategoryCell}
                        <td>${subItem}</td>
                        <td class="text-right">${cost.toLocaleString('vi-VN')}</td>
                    `;
                    detailedBreakdownTableBody.appendChild(row);
                }
            }

            const paymentStages = [
                { stage: 1, description: 'Tạm ứng ngay khi ký hợp đồng', percentage: 15 },
                { stage: 2, description: 'Sau khi hoàn thành phần móng', percentage: 20 },
                { stage: 3, description: 'Sau khi hoàn thành kết cấu khung bê tông', percentage: 20 },
                { stage: 4, description: 'Sau khi hoàn thành xây tô, đi hệ thống M&E', percentage: 20 },
                { stage: 5, description: 'Hoàn thiện, trước khi bàn giao nhà', percentage: 23 },
                { stage: 6, description: 'Bảo hành công trình (sau khi bàn giao)', percentage: 2 }
            ];

            paymentScheduleTableBody.innerHTML = '';
            paymentStages.forEach(item => {
                const amount = totalEstimatedCost * (item.percentage / 100);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="text-center">${item.stage}</td>
                    <td>${item.description}</td>
                    <td class="text-right">${item.percentage}%</td>
                    <td class="text-right font-semibold">${amount.toLocaleString('vi-VN')}</td>
                `;
                paymentScheduleTableBody.appendChild(row);
            });

            resultsSection.classList.remove('hidden');
            costLoadingSpinner.classList.add('hidden'); // Hide spinner

        }, 800);
    });

    sendEmailBtn.addEventListener('click', () => {
        if (!lastQuoteData) {
            alert('Lỗi: Không có dữ liệu báo giá. Vui lòng thực hiện ước tính trước.');
            return;
        }

        emailNotification.textContent = 'Đang chuẩn bị mở trình gửi email của bạn...';
        emailNotification.classList.remove('hidden');

        const { email, area, floors, style, finish, foundationType, mezzanineOption, rooftopOption, roofType, totalEstimatedCost } = lastQuoteData;

        const recipient = 'esb.homes.company@gmail.com';
        const subject = `Yêu cầu Báo giá Xây dựng - ${email}`;
        const body = `
Chào ESB Homes,

Tôi muốn yêu cầu báo giá chi tiết dựa trên các thông tin sau:

--- CHI TIẾT DỰ ÁN ---
- Email liên hệ: ${email}
- Diện tích sàn: ${area} m²
- Số tầng: ${floors}
- Phong cách: ${style}
- Mức độ hoàn thiện: ${finish}
- Loại móng: ${foundationType}
- Có tầng lửng: ${mezzanineOption}
- Có sân thượng: ${rooftopOption}
- Loại mái: ${roofType}

--- CHI PHÍ ƯỚC TÍNH SƠ BỘ ---
- Tổng chi phí: ${totalEstimatedCost.toLocaleString('vi-VN')} VNĐ

Vui lòng liên hệ lại với tôi qua email trên để tư vấn thêm.
Cảm ơn.
        `.trim().replace(/^\s+/gm, '');

        const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        window.location.href = mailtoLink;

        setTimeout(() => {
            emailNotification.classList.add('hidden');
        }, 3000);
    });

    // --- Header Navigation & Side Menu Logic ---
    const mainHeader = document.getElementById('main-header'); // Giữ lại khai báo này
    const hamburgerBtn = document.getElementById('hamburger-menu-button');
    const closeSideMenuBtn = document.getElementById('close-side-menu');
    const sideMenu = document.getElementById('side-menu');
    const sideMenuOverlay = document.getElementById('side-menu-overlay');
    const desktopNavList = document.getElementById('desktop-nav-list');
    const sideNavList = document.getElementById('side-nav-list');

    // Section definitions for both menus
    const menuSections = [
        { id: 'gioi-thieu', text: 'Giới thiệu', icon: '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path></svg>' },
        { id: 've-chung-toi', text: 'Về chúng tôi', icon: '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>' },
        { id: 'yeu-to-anh-huong', text: 'Yếu tố ảnh hưởng', icon: '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path></svg>' },
        { 
            id: 'bao-gia', text: 'Báo giá', icon: '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"></path></svg>',
            subItems: [
                { id: 'bao-gia-xd-tron-goi', text: 'XD Trọn Gói' },
                { id: 'bao-gia-thiet-ke-kien-truc', text: 'Thiết Kế KT' },
                { id: 'bao-gia-xd-phan-tho', text: 'XD Phần Thô' },
                { id: 'bao-gia-xd-phan-hoan-thien', text: 'XD Hoàn Thiện' }
            ]
        },
        { id: 'cac-goi-xay-dung', text: 'Gói xây dựng', icon: '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>' },
        { id: 'luu-y-quan-trong', text: 'Lưu ý quan trọng', icon: '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path></svg>' },
        { id: 'lien-he', text: 'Liên hệ', icon: '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"></path></svg>' }
    ];

    // Function to generate menu items for a given list element
    const generateMenuItems = (menuListElement, isSideMenu = false) => {
        menuListElement.innerHTML = ''; // Clear existing items
        menuSections.forEach(section => {
            const listItem = document.createElement('li');
            
            // Determine the base class for the main link based on where it's being generated
            const mainLinkClass = isSideMenu ? '' : 'nav-link'; // 'nav-link' for desktop header, no extra class for side menu (uses side-menu ul li a)

            if (section.subItems) {
                // Main item with sub-menu
                listItem.innerHTML = `
                    <a href="#${section.id}" class="flex items-center ${mainLinkClass}">
                        ${isSideMenu ? (section.icon || '') : ''}<span>${section.text}</span>
                    </a>
                    <ul class="pl-4 mt-1 space-y-1 ${isSideMenu ? 'text-base' : 'text-sm'}">
                        ${section.subItems.map(subItem => `
                            <li><a href="#${subItem.id}" class="block p-1 rounded-md ${isSideMenu ? 'sub-side-link' : 'sub-nav-link'}">${subItem.text}</a></li>
                        `).join('')}
                    </ul>
                `;
            } else {
                // Regular item
                listItem.innerHTML = `<a href="#${section.id}" class="flex items-center ${mainLinkClass}">${isSideMenu ? (section.icon || '') : ''}<span>${section.text}</span></a>`;
            }
            menuListElement.appendChild(listItem);
        });
    };

    // Populate both menus on load
    generateMenuItems(desktopNavList, false); // Populate desktop header nav
    generateMenuItems(sideNavList, true); // Populate side menu

    const allSections = document.querySelectorAll('section'); // All observable sections for IntersectionObserver
    const allDesktopNavLinks = document.querySelectorAll('#desktop-nav-list a');
    const allSideMenuLinks = document.querySelectorAll('#side-nav-list a');

    const toggleSideMenu = () => {
        sideMenu.classList.toggle('translate-x-full');
        sideMenuOverlay.classList.toggle('hidden');
        sideMenuOverlay.classList.toggle('opacity-0');
        sideMenuOverlay.classList.toggle('opacity-50');
        document.body.classList.toggle('overflow-hidden'); // Prevent body scroll when menu is open
    };

    hamburgerBtn.addEventListener('click', toggleSideMenu);
    closeSideMenuBtn.addEventListener('click', toggleSideMenu);
    sideMenuOverlay.addEventListener('click', toggleSideMenu);

    // Close side menu when a link inside it is clicked
    allSideMenuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default hash jump
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
            toggleSideMenu(); // Close the side menu after clicking a link
        });
    });

    // Handle smooth scrolling for floating TOC links (already exists, but ensure it works)
    // Note: The floating TOC is for large screens only, but the listener is harmless.
    document.querySelectorAll('#floating-nav-list a').forEach(link => { // Re-selecting for clarity
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });


    // Intersection Observer to highlight active section in both menus
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');

                // Update desktop navigation links
                allDesktopNavLinks.forEach(link => {
                    link.classList.remove('active-nav-link'); // Correct class for desktop
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active-nav-link');
                    } else if (id.startsWith('bao-gia-') && link.getAttribute('href') === '#bao-gia') {
                        link.classList.add('active-nav-link'); // Highlight main 'Báo giá' if sub-section is active
                    }
                });

                // Update side menu links
                allSideMenuLinks.forEach(link => {
                    link.classList.remove('active-side-link'); // Correct class for side menu
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active-side-link');
                    } else if (id.startsWith('bao-gia-') && link.getAttribute('href') === '#bao-gia') {
                        link.classList.add('active-side-link'); // Highlight main 'Báo giá' if sub-section is active
                    }
                });
            }
        });
    }, { rootMargin: '-30% 0px -70% 0px' }); // Adjust rootMargin for active state accuracy

    allSections.forEach(section => {
        sectionObserver.observe(section);
    });

    // Optional: Shrink header on scroll (similar to TrungLuongCons.com)
    // Removed redundant 'const mainHeader' declaration here.
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) { // Adjust scroll threshold as needed
            mainHeader.classList.add('header-scrolled');
        } else {
            mainHeader.classList.remove('header-scrolled');
        }
    });
};

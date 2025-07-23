/**
 * ===================================================================
 * CÀI ĐẶT CỦA BẠN - HÃY CHỈNH SỬA PHẦN NÀY
 * ===================================================================
 */

const N8N_WEBHOOK_URL = 'https://n8n.aipencil.ai/webhook/extension';

// 🎯 QUAN TRỌNG: adContainer đã chuẩn. BÂY GIỜ HÃY TÌM CÁC SELECTOR BÊN DƯỚI.
const SELECTORS = {
    // Selector cho thẻ DIV bao ngoài cùng của một quảng cáo (GIỮ NGUYÊN)
    adContainer: 'div.x1plvlek.xryxfnj.x1gzqxud.x178xt8z.x1lun4ml.xso031l.xpilrb4.xb9moi8.xe76qn7.x21b0me.x142aazg.x1i5p2am.x1whfx0g.xr2y4jy.x1ihp6rs.x1kmqopl.x13fuv20.x18b5jzi.x1q0q8m5.x1t7ytsu.x9f619',

    // --- CÁC SELECTOR MỚI CẦN TÌM ---

    // Tên nhà quảng cáo
    advertiserName: 'span.x8t9es0.x1fvot60.xxio538.x108nfp6.xq9mrsl.x1h4wwuj.x117nqv4.xeuugli',

    // Dòng văn bản chứa trạng thái "Hoạt động"
    statusText: 'span.x8t9es0.xw23nyj.x63nzvj.xmbzoqv.xq9mrsl.x1h4wwuj.x117nqv4.xeuugli.x13fj5qh',

    // Dòng văn bản chứa ngày bắt đầu chạy "Đã bắt đầu chạy vào..."
    startDateText: 'span.x8t9es0.xw23nyj.xo1l8bm.x63nzvj.x108nfp6.xq9mrsl.x1h4wwuj.xeuugli',

    // Các icon của nền tảng (Facebook, Instagram,...)
    platformIcons: 'div.xtwfq29',

    // caption của quảng cáo (nếu có)
    caption: 'div[style*="white-space: pre-wrap"] > span',

    // Thẻ video hoặc image chính
    adVideo: 'video',
    adImage: 'img[referrerpolicy="origin-when-cross-origin"]'
};

/**
 * ===================================================================
 * MÃ NGUỒN CỐT LÕI - ĐÃ NÂNG CẤP
 * ===================================================================
 */

// --- CÁC HÀM PHỤ TRỢ ĐỂ BÓC TÁCH DỮ LIỆU ---

function getStatusAndDates(container) {
    let status = 'Unknown';
    let startDate = null;
    let timeRunning = null;

    const containerText = container.innerText;

    if (containerText.includes('Hoạt động')) {
        status = 'Still Running';
    }

    // Biểu thức chính quy mới, khớp với "Ngày bắt đầu chạy" hoặc "Đã bắt đầu chạy vào"
    const datePattern = /(?:Ngày bắt đầu chạy|Đã bắt đầu chạy vào):?\s*(\d{1,2}) Tháng (\d{1,2}), (\d{4})/;
    const dateMatch = containerText.match(datePattern);

    if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10) - 1; // Tháng trong JS bắt đầu từ 0
        const year = parseInt(dateMatch[3], 10);
        
        startDate = new Date(year, month, day);

        const today = new Date();
        const diffTime = Math.abs(today - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        timeRunning = `${diffDays} Days`;
    }

    return { status, startDate, timeRunning };
}

function getFormat(container) {
    if (container.querySelector(SELECTORS.adVideo)) return 'Video';
    if (container.querySelector(SELECTORS.adImage)) return 'Image';
    return 'Unknown';
}

function getPlatforms(container) {
    const platforms = [];
    const icons = container.querySelectorAll(SELECTORS.platformIcons);
    icons.forEach(icon => {
        const style = icon.style.getPropertyValue('mask-image') || icon.style.getPropertyValue('background-image');
        if (style.includes('TP7nCDju1B-.png')) platforms.push('Facebook'); // Ví dụ
        if (style.includes('SfkOtt7be68.png')) platforms.push('Instagram'); // Ví dụ
        if (style.includes('r35dp7ubbrO.png')) platforms.push('Messenger'); // Ví dụ
        if (style.includes('TP7nCDju1B-.png')) platforms.push('Threads');
        if (style.includes('r35dp7ubbrO.png')) platforms.push('Audience Network');
    });
    return [...new Set(platforms)];
}

function getAspectRatio(container) {
    const video = container.querySelector(SELECTORS.adVideo);
    if (video) {
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (width > 0 && height > 0) {
            if (height > width) return 'Vertical'; // 9:16, 4:5 etc.
            if (width > height) return 'Horizontal'; // 16:9 etc.
            return 'Square'; // 1:1
        }
    }
    return 'Unknown';
}

// --- HÀM CHÍNH ĐỂ THU THẬP VÀ GỬI DỮ LIỆU ---

function extractAdData(container) {
    const { status, startDate, timeRunning } = getStatusAndDates(container);

    // Lấy URL hình ảnh/video
    const adImageElements = container.querySelectorAll(SELECTORS.adImage);
    const adVideoElements = container.querySelectorAll(SELECTORS.adVideo);

    const imageUrls = Array.from(adImageElements).map(img => img.src);
    const videoUrls = Array.from(adVideoElements).map(video => video.src);

    // Lấy HTML thô của container quảng cáo
    const rawHtml = container.outerHTML;

    return {
        brand: container.querySelector(SELECTORS.advertiserName)?.innerText.trim() || null,
        status: status,
        start_date: startDate ? startDate.toISOString().split('T')[0] : null,
        time_running: timeRunning,
        format: getFormat(container),
        platforms: getPlatforms(container),
        aspect_ratio: getAspectRatio(container),
        ad_id: (container.innerHTML.match(/ID thư viện: (\d+)/) || [])[1] || null,
        // Thêm các trường mới
        image_url: imageUrls,
        video_url: videoUrls,
        raw_html: rawHtml,
        caption: container.querySelector(SELECTORS.caption)?.innerText.trim() || null
    };
}

function createSaveButton(adContainer) {
    const button = document.createElement('button');
    button.innerText = 'Save this Ad';
    button.className = 'my-custom-save-button';
    Object.assign(button.style, {
        width: '90%',
        marginTop: '8px', // Tạo khoảng cách với nút bên trên
        padding: '8px 12px',
        border: 'none', // Bỏ viền để giống nút gốc
        borderRadius: '6px',
        backgroundColor: '#f0f2f5', // Màu xám nhạt giống Facebook
        color: '#050505', // Màu chữ đen
        fontWeight: '600', // In đậm vừa phải
        cursor: 'pointer',
        textAlign: 'center',
        display: 'block',      // Đảm bảo margin: auto hoạt động
        marginLeft: 'auto',    // Tự động căn lề trái
        marginRight: 'auto'    // Tự động căn lề phải
    });

    // Thêm hiệu ứng khi di chuột vào cho giống nút thật
    button.onmouseover = () => button.style.backgroundColor = '#e4e6e9';
    button.onmouseout = () => {
        if (!button.disabled) {
            button.style.backgroundColor = '#f0f2f5';
        }
    };

    button.addEventListener('click', async () => {
        button.innerText = 'Saving...';
        button.disabled = true;
        button.style.backgroundColor = '#e7f3ff'; // Đổi màu khi đang lưu
        button.style.color = '#1877f2';

        const adData = extractAdData(adContainer);
        console.log("Data to be sent:", adData);

        try {
            await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(adData),
            });
            button.innerText = 'Saved!';
            button.style.backgroundColor = '#dff0d8';
            button.style.color = '#3c763d';
            button.disabled = true;
        } catch (error) {
            console.error('Lỗi khi gửi đến n8n:', error);
            button.innerText = 'Error! Try Again';
            button.disabled = false;
            // Trả lại style ban đầu khi có lỗi
            button.style.backgroundColor = '#f0f2f5';
            button.style.color = '#050505';
        }
    });
    return button;
}

// --- CÁC HÀM KHỞI TẠO VÀ THEO DÕI ---

// Hàm tìm vị trí để chèn nút "Save"
function findTargetButtonContainer(container) {
    const allSpans = container.querySelectorAll('span');
    for (const span of allSpans) {
        const text = span.innerText;
        if (
            (
                text.includes('Xem chi tiết quảng cáo') ||
                text.includes('Xem chi tiết bản tóm tắt') ||
                text.includes('See ad details') ||
                text.includes('See summary details')
            )
            && text.length < 50
        ) {
            // Trả về thẻ DIV cha chứa nút này, là nơi lý tưởng để thêm nút của chúng ta
            const buttonWrapper = span.closest('div[role="button"]');
            if (buttonWrapper) {
                return buttonWrapper.parentElement;
            }
        }
    }
    return null;
}

// Hàm chính để quét và thêm nút vào các quảng cáo
function addSaveButtonToAds() {
    const adContainers = document.querySelectorAll(SELECTORS.adContainer);
    adContainers.forEach(container => {
        if (container.querySelector('.my-custom-save-button')) return;

        const targetLocation = findTargetButtonContainer(container);
        if (targetLocation) {
            // Thay vì appendChild, ta dùng insertAfter để chèn nút mới vào ngay sau cụm nút gốc
            const saveButton = createSaveButton(container);
            targetLocation.parentNode.insertBefore(saveButton, targetLocation.nextSibling);
        }
    });
}

// Khởi tạo một MutationObserver để theo dõi các thay đổi trên trang
// (khi người dùng cuộn và tải thêm quảng cáo)
const observer = new MutationObserver(() => {
    // Dùng setTimeout để trì hoãn một chút, đảm bảo DOM đã ổn định
    setTimeout(addSaveButtonToAds, 500);
});

// Bắt đầu theo dõi sự thay đổi của toàn bộ trang
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Chạy hàm lần đầu sau khi tải trang một chút để các quảng cáo đầu tiên hiện ra
setTimeout(addSaveButtonToAds, 2000);
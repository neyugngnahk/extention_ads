// Đảm bảo rằng file HTML đã được tải xong trước khi chạy mã
document.addEventListener('DOMContentLoaded', function() {
  // Tìm nút bấm bằng ID của nó
  const openButton = document.getElementById('openAdLibBtn');

  // Thêm sự kiện 'click' cho nút bấm
  openButton.addEventListener('click', function() {
    // Sử dụng API của Chrome để tạo một tab mới
    chrome.tabs.create({ url: 'https://www.facebook.com/ads/library' });
  });
});
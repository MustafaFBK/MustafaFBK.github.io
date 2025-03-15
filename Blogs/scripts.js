document.addEventListener("DOMContentLoaded", async () => {
  // DOM Elements
  const blogPopup = document.getElementById("blogPopup");
  const blogPopupOverlay = document.getElementById("blogPopupOverlay");
  const blogPopupTitle = document.getElementById("blogPopupTitle");
  const blogPopupMeta = document.getElementById("blogPopupMeta");
  const blogPopupContent = document.getElementById("blogPopupContent");
  const blogPopupClose = document.getElementById("blogPopupClose");
  const searchBar = document.getElementById("searchBar");
  const blogsContainer = document.getElementById("blogs-container");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");
  const searchBtn = document.querySelector(".search-btn");
  const themeToggle = document.getElementById("theme-toggle");

  // Check for required elements
  if (
    !blogPopup ||
    !blogPopupOverlay ||
    !blogPopupTitle ||
    !blogPopupMeta ||
    !blogPopupContent ||
    !blogPopupClose ||
    !searchBar ||
    !blogsContainer ||
    !prevPageBtn ||
    !nextPageBtn ||
    !pageInfo ||
    !searchBtn
  ) {
    console.error("Missing elements in DOM");
    blogsContainer.innerHTML =
      '<p class="error-message">Error: Unable to load blog content. Please check your setup.</p>';
    return;
  }

  // Fetch Blog Data
  let blogs = [];
  try {
    const response = await fetch("blogData.json"); // Adjust path if necessary (e.g., 'data/blogData.json')
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    blogs = await response.json();
  } catch (error) {
    console.error("Error fetching blog data:", error);
    blogsContainer.innerHTML =
      '<p class="error-message">Error: Unable to load blog data. Please try again later.</p>';
    return;
  }

  // Pagination
  const itemsPerPage = 3;
  let currentPage = 1;
  let filteredBlogs = [...blogs];

  // Render Blogs
  function renderBlogs(page = 1) {
    blogsContainer.innerHTML = "";
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedBlogs = filteredBlogs.slice(start, end);

    if (paginatedBlogs.length === 0) {
      blogsContainer.innerHTML =
        '<p class="error-message">No blogs found matching your search.</p>';
      updatePagination(1, 0);
      return;
    }

    paginatedBlogs.forEach((blog, index) => {
      const totalIndex = start + index;
      const card = document.createElement("div");
      card.className = "blog-card";
      card.setAttribute("data-index", totalIndex);

      card.innerHTML = `
      <img src="${blog.image}" alt="${blog.title} Image" loading="lazy">
      <div class="card-content">
        <h2>${blog.title}</h2>
        <p class="date">> Date: ${blog.date}</p>
        <p class="excerpt">${blog.excerpt}</p>
        <button class="read-more-btn">Execute Read</button>
      </div>
    `;
      blogsContainer.appendChild(card);
    });

    updatePagination(page, Math.ceil(filteredBlogs.length / itemsPerPage));
    
  } // Update Pagination
  function updatePagination(current, total) {
    prevPageBtn.disabled = current === 1;
    nextPageBtn.disabled = current === total || total === 0;
    pageInfo.textContent =
      total > 0 ? `Page ${current} of ${total}` : "No pages available";
  }

  // Pagination Event Listeners
  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderBlogs(currentPage);
    }
  });

  nextPageBtn.addEventListener("click", () => {
    if (currentPage < Math.ceil(filteredBlogs.length / itemsPerPage)) {
      currentPage++;
      renderBlogs(currentPage);
    }
  });

  // Open Blog Popup
  function openBlogPopup(index) {
    const blog = filteredBlogs[index];
    if (!blog) return;

    blogPopupTitle.textContent = blog.title;
    blogPopupMeta.textContent = blog.meta;
    blogPopupContent.innerHTML = marked.parse(blog.content); // Render Markdown content

    // Reset popup position and size
    blogPopup.style.display = "block";
    blogPopupOverlay.style.display = "block";
    blogPopup.style.opacity = "0";
    blogPopup.style.transform = "translate(-50%, 0) scale(0.7)";
    blogPopup.style.width = "60%";
    blogPopup.style.maxWidth = "700px";
    blogPopup.style.maxHeight = "80vh";
    blogPopup.style.left = "50%";
    blogPopup.classList.remove("is-resizing");
    document.body.style.overflow = "hidden";

    // Animate popup
    gsap.to(blogPopupOverlay, {
      opacity: 1,
      duration: 0.3,
      ease: "power2.out",
    });
    gsap.to(blogPopup, {
      opacity: 1,
      scale: 1,
      duration: 0.5,
      ease: "power2.out",
      transformOrigin: "center center",
      onComplete: () => {
        blogPopupClose.focus();
      },
    });

    // Center popup on scroll
    centerPopup();
  }

  // Close Blog Popup
  function closeBlogPopup() {
    gsap.to(blogPopup, {
      opacity: 0,
      scale: 0.9,
      duration: 0.4,
      ease: "power2.in",
      onComplete: () => {
        blogPopup.style.display = "none";
        blogPopupOverlay.style.display = "none";
        blogPopup.classList.remove("is-resizing");
        document.body.style.overflow = "auto";
      },
    });
    gsap.to(blogPopupOverlay, { opacity: 0, duration: 0.3, ease: "power2.in" });
  }

  // Center Popup on Scroll and Resize
  function centerPopup() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const popUpHeight = blogPopup.offsetHeight;
    const windowHeight = window.innerHeight;
    const top = Math.max(50, scrollTop + (windowHeight - popUpHeight) / 2);
    blogPopup.style.top = `${top}px`;
  }

  // Popup Resize Handling
  let isDragging = false;
  let startX, startY, startWidth, startHeight, startLeft, startTop;
  let edge = null; // Track which edge/corner is being dragged
  const edgeThreshold = 10; // Pixels from edge to detect drag

  // Detect edge or corner on mousedown
  blogPopup.addEventListener("mousedown", (e) => {
    const rect = blogPopup.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    // Determine which edge or corner is being clicked
    const nearTop = y <= edgeThreshold;
    const nearBottom = y >= height - edgeThreshold;
    const nearLeft = x <= edgeThreshold;
    const nearRight = x >= width - edgeThreshold;

    if (nearTop && nearLeft) edge = "top-left";
    else if (nearTop && nearRight) edge = "top-right";
    else if (nearBottom && nearLeft) edge = "bottom-left";
    else if (nearBottom && nearRight) edge = "bottom-right";
    else if (nearTop) edge = "top";
    else if (nearBottom) edge = "bottom";
    else if (nearLeft) edge = "left";
    else if (nearRight) edge = "right";
    else return; // Not on an edge or corner

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseFloat(getComputedStyle(blogPopup).width);
    startHeight = parseFloat(getComputedStyle(blogPopup).height);
    startLeft = parseFloat(getComputedStyle(blogPopup).left);
    startTop = parseFloat(getComputedStyle(blogPopup).top);
    document.body.style.userSelect = "none"; // Prevent text selection during drag
    blogPopup.classList.add("is-resizing"); // Add class to trigger visual feedback
  });

  // Detect edge or corner on mousemove (for cursor change)
  blogPopup.addEventListener("mousemove", (e) => {
    if (isDragging) return;

    const rect = blogPopup.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    const nearTop = y <= edgeThreshold;
    const nearBottom = y >= height - edgeThreshold;
    const nearLeft = x <= edgeThreshold;
    const nearRight = x >= width - edgeThreshold;

    if (nearTop && nearLeft) blogPopup.style.cursor = "nwse-resize";
    else if (nearTop && nearRight) blogPopup.style.cursor = "nesw-resize";
    else if (nearBottom && nearLeft) blogPopup.style.cursor = "nesw-resize";
    else if (nearBottom && nearRight) blogPopup.style.cursor = "nwse-resize";
    else if (nearTop) blogPopup.style.cursor = "ns-resize";
    else if (nearBottom) blogPopup.style.cursor = "ns-resize";
    else if (nearLeft) blogPopup.style.cursor = "ew-resize";
    else if (nearRight) blogPopup.style.cursor = "ew-resize";
    else blogPopup.style.cursor = "default";
  });

  // Reset cursor when leaving popup
  blogPopup.addEventListener("mouseleave", () => {
    if (!isDragging) {
      blogPopup.style.cursor = "default";
    }
  });

  // Handle dragging
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    // Minimum and maximum dimensions
    const minWidth = 300;
    const minHeight = 400;
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;

    // Adjust dimensions based on edge/corner
    if (edge.includes("right")) {
      newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX));
    }
    if (edge.includes("left")) {
      newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth - deltaX));
      newLeft = startLeft + deltaX;
    }
    if (edge.includes("bottom")) {
      newHeight = Math.min(
        maxHeight,
        Math.max(minHeight, startHeight + deltaY)
      );
    }
    if (edge.includes("top")) {
      newHeight = Math.min(
        maxHeight,
        Math.max(minHeight, startHeight - deltaY)
      );
      newTop = startTop + deltaY;
    }

    // Apply new dimensions and position
    blogPopup.style.width = `${newWidth}px`;
    blogPopup.style.maxWidth = `${newWidth}px`;
    blogPopup.style.maxHeight = `${newHeight}px`;
    blogPopup.style.left = `${newLeft}px`;
    blogPopup.style.top = `${newTop}px`;

    // Recenter the popup after resizing (for top/bottom edges)
    if (edge === "top" || edge === "bottom") {
      centerPopup();
    }
  });

  // Stop dragging
  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.userSelect = "auto";
      blogPopup.classList.remove("is-resizing");
      blogPopup.style.cursor = "default";
    }
  });

  // Prevent dragging outside the popup
  document.addEventListener("mouseleave", () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.userSelect = "auto";
      blogPopup.classList.remove("is-resizing");
      blogPopup.style.cursor = "default";
    }
  });

  // Event Listeners for Blog Cards
  blogsContainer.addEventListener("click", (e) => {
    const readMoreBtn = e.target.closest(".read-more-btn");
    if (readMoreBtn) {
      const card = readMoreBtn.closest(".blog-card");
      const index = parseInt(card.getAttribute("data-index"), 10);
      if (!isNaN(index) && index >= 0 && index < filteredBlogs.length) {
        openBlogPopup(index);
      }
    }
  });

  // Event Listeners for Popup
  blogPopupClose.addEventListener("click", closeBlogPopup);
  blogPopupOverlay.addEventListener("click", closeBlogPopup);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && blogPopup.style.display === "block") {
      closeBlogPopup();
    }
  });

  // Recenter on scroll and resize
  window.addEventListener("scroll", centerPopup);
  window.addEventListener("resize", centerPopup);

  // Search Functionality
  function searchBlogs() {
    const query = searchBar.value.trim().toLowerCase();
    filteredBlogs =
      query === ""
        ? [...blogs]
        : blogs.filter(
            (blog) =>
              blog.title.toLowerCase().includes(query) ||
              blog.content.toLowerCase().includes(query)
          );
    currentPage = 1;
    renderBlogs(currentPage);
  }

  searchBar.addEventListener("input", searchBlogs);
  searchBtn.addEventListener("click", searchBlogs);

  // Theme Toggle
  function toggleTheme() {
    const body = document.body;
    body.classList.toggle("light-mode");
    const isLight = body.classList.contains("light-mode");

    // Update theme in local storage
    localStorage.setItem("theme", isLight ? "light" : "dark");
  }

  // Apply saved theme
  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-mode");
    toggleTheme();
  }

  themeToggle.addEventListener("click", toggleTheme);

  // Initial render
  renderBlogs();
});

// Fallback image handling
function handleImageError(event) {
  event.target.src = "fallback.png";
}

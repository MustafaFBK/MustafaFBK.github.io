// Configuration object for constants
const CONFIG = {
  MAX_SUBMISSIONS: 5, // Max submissions per hour
  SUBMISSION_WINDOW: 3600000, // 1 hour in milliseconds
  COLORS: { success: "#09ff00", error: "#ff0000" },
  SERVICE_ID: "service_gqhea72",
  TEMPLATE_ID: "template_xwa79ym",
  AUTO_REPLY_TEMPLATE_ID: "template_auto_reply_perfect", // Replace with your actual auto-reply template ID
  REDIRECT_DELAY: 2000, // 2 seconds delay for redirect after "Sending..."
};

// Store submission timestamps in localStorage for rate limiting
let submissionHistory =
  JSON.parse(localStorage.getItem("submissionHistory")) || [];

function sendMail() {
  // Retrieve DOM elements
  const contactForm = document.getElementById("contact-form");
  const submitButton = document.getElementById("button");
  const formMessage = document.getElementById("form-message");

  // Validate that all required elements exist
  if (!contactForm || !submitButton || !formMessage) {
    console.error("Error: Contact form elements are missing.", {
      contactForm,
      submitButton,
      formMessage,
    });
    return;
  }

  // Prevent browser autocomplete on form fields
  contactForm.setAttribute("autocomplete", "off");
  ["name", "email", "message"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.setAttribute("autocomplete", "off");
  });

  // Apply client-side rate limiting
  const currentTime = Date.now();
  submissionHistory = submissionHistory.filter(
    (timestamp) => currentTime - timestamp < CONFIG.SUBMISSION_WINDOW
  );
  if (submissionHistory.length >= CONFIG.MAX_SUBMISSIONS) {
    updateMessage(
      "Too many submissions. Please try again later (max 5 per hour).",
      CONFIG.COLORS.error
    );
    submitButton.textContent = "Transmit Securely";
    console.log("Rate limit exceeded:", submissionHistory.length);
    return;
  }

  // Extract and sanitize form input values to prevent XSS
  const name = sanitizeInput(contactForm.querySelector("#name").value.trim());
  const email = sanitizeInput(contactForm.querySelector("#email").value.trim());
  const message = sanitizeInput(
    contactForm.querySelector("#message").value.trim()
  );

  // Perform input validation
  if (!name || name.length < 2 || name.length > 50) {
    updateMessage(
      "Name must be between 2 and 50 characters.",
      CONFIG.COLORS.error
    );
    submitButton.textContent = "Transmit Securely";
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    updateMessage("Please enter a valid email address.", CONFIG.COLORS.error);
    submitButton.textContent = "Transmit Securely";
    return;
  }
  if (!message || message.length < 10 || message.length > 1000) {
    updateMessage(
      "Message must be between 10 and 1000 characters.",
      CONFIG.COLORS.error
    );
    submitButton.textContent = "Transmit Securely";
    return;
  }

  // Generate and set CSRF token (client-side; recommend server-side in production)
  const csrfToken = generateCSRFToken();
  let tokenInput = contactForm.querySelector('[name="csrf_token"]');
  if (!tokenInput) {
    tokenInput = document.createElement("input");
    tokenInput.type = "hidden";
    tokenInput.name = "csrf_token";
    tokenInput.value = csrfToken;
    contactForm.appendChild(tokenInput);
  } else {
    tokenInput.value = csrfToken;
  }

  // Generate and validate CAPTCHA
  const captchaNumber = Math.floor(Math.random() * 10) + 1;
  const captchaResponse = prompt(
    `Please enter the number ${captchaNumber} to verify you are not a bot:`
  );
  if (!captchaResponse || captchaResponse !== captchaNumber.toString()) {
    updateMessage(
      "CAPTCHA verification failed. Please try again.",
      CONFIG.COLORS.error
    );
    submitButton.textContent = "Transmit Securely";
    console.log("CAPTCHA failed:", { captchaNumber, captchaResponse });
    return;
  }

  // Prepare parameters for EmailJS
  const params = { name, email, message, csrf_token: csrfToken };

  // Update button text to indicate sending
  submitButton.textContent = "Sending...";
  console.log("Sending email with params:", params);

  // Schedule page refresh 2 seconds after "Sending..." appears
  setTimeout(() => {
    console.log("Attempting to redirect...");
    contactForm.reset(); // Reset form to clear data
    window.location.href = window.location.pathname; // Redirect without query params
  }, CONFIG.REDIRECT_DELAY);

  // Send email via EmailJS (runs in background)
  emailjs
    .send(CONFIG.SERVICE_ID, CONFIG.TEMPLATE_ID, params)
    .then((response) => {
      console.log("First email sent:", response);
      return emailjs.send(
        CONFIG.SERVICE_ID,
        CONFIG.AUTO_REPLY_TEMPLATE_ID,
        params
      );
    })
    .then((response) => {
      console.log("Auto-reply sent:", response);
      submissionHistory.push(currentTime);
      localStorage.setItem(
        "submissionHistory",
        JSON.stringify(submissionHistory)
      );

      // Store success message in localStorage for display after redirect
      localStorage.setItem(
        "formSuccess",
        "Message sent successfully! An auto-reply has been sent to your email."
      );
    })
    .catch((error) => {
      console.error("Email sending failed:", error);
      // Store error message in localStorage for display after redirect
      localStorage.setItem(
        "formError",
        "Failed to send message. Please try again later."
      );
    });
}

// Helper function to update form message
function updateMessage(text, color) {
  const formMessage = document.getElementById("form-message");
  formMessage.textContent = text;
  formMessage.style.color = color;
}

// Helper function to sanitize input and prevent XSS
function sanitizeInput(input) {
  const div = document.createElement("div");
  div.textContent = input;
  return div.innerHTML; // Escapes HTML characters
}

// CSRF token generator (for demo; use server-side in production)
function generateCSRFToken() {
  return Math.random().toString(36).substr(2) + Date.now().toString(36);
}

// Initialize form submission and handle page load
document.addEventListener("DOMContentLoaded", () => {
  const contactForm = document.getElementById("contact-form");
  const formMessage = document.getElementById("form-message");
  if (!contactForm) {
    console.error("Contact form not found.");
    return;
  }

  // Prevent autocomplete on form load
  contactForm.setAttribute("autocomplete", "off");
  ["name", "email", "message"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.setAttribute("autocomplete", "off");
  });

  // Handle form submission
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent default form submission
    console.log("Form submission triggered.");
    sendMail();
  });

  // Clear form and remove query parameters on page load if present
  if (window.location.search) {
    contactForm.reset();
    window.history.replaceState({}, document.title, window.location.pathname); // Remove query params from URL
    console.log("Cleared query parameters on load:", window.location.search);
  }

  // Display success or error message from previous submission
  const successMessage = localStorage.getItem("formSuccess");
  const errorMessage = localStorage.getItem("formError");
  if (successMessage) {
    formMessage.textContent = successMessage;
    formMessage.style.color = CONFIG.COLORS.success;
    localStorage.removeItem("formSuccess"); // Clear the message after displaying
  } else if (errorMessage) {
    formMessage.textContent = errorMessage;
    formMessage.style.color = CONFIG.COLORS.error;
    localStorage.removeItem("formError"); // Clear the message after displaying
  }
});

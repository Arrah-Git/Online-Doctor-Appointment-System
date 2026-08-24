document.addEventListener("DOMContentLoaded", () => {
    let dashboardAuthPassword = "";

    const loginBox = document.getElementById("loginBox");
    const dashboardBox = document.getElementById("dashboardBox");
    const passwordInput = document.getElementById("dashboardPasswordInput");
    const togglePasswordBtn = document.getElementById("togglePasswordBtn");
    const dashboardLoginBtn = document.getElementById("dashboardLoginBtn");
    const dashboardLogoutBtn = document.getElementById("dashboardLogoutBtn");
    const loginError = document.getElementById("loginError");

    const doctorFilter = document.getElementById("doctorFilter");
    const statusFilter = document.getElementById("statusFilter");
    const refreshBtn = document.getElementById("refreshBtn");
    const dashboardAppointmentsList = document.getElementById("dashboardAppointmentsList");

    let isLoggedIn = false;

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatDate(date) {
        if (!date) return "";

        const formatted = new Date(date);

        if (Number.isNaN(formatted.getTime())) {
            return date;
        }

        return formatted.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function formatTime(time) {
        if (!time) return "";

        const value = String(time).trim();

        if (/am|pm/i.test(value)) {
            return value;
        }

        const parts = value.split(":");

        if (parts.length < 2) {
            return value;
        }

        const hours = Number(parts[0]);
        const minutes = parts[1];
        const suffix = hours >= 12 ? "PM" : "AM";
        const displayHour = hours % 12 || 12;

        return `${displayHour}:${minutes} ${suffix}`;
    }

    function getAuthHeaders() {
        return {
            "x-dashboard-password": dashboardAuthPassword
        };
    }

    async function login() {
        const password = passwordInput.value.trim();

        if (!password) {
            loginError.textContent = "Please enter your password.";
            loginError.style.display = "block";
            return;
        }

        dashboardLoginBtn.disabled = true;
        dashboardLoginBtn.textContent = "Logging in...";
        loginError.style.display = "none";

        try {
            const response = await fetch("/api/doctor/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    password
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                loginError.textContent = result.message || "Incorrect password.";
                loginError.style.display = "block";
                passwordInput.value = "";
                passwordInput.focus();
                return;
            }

            dashboardAuthPassword = password;
            isLoggedIn = true;

            loginBox.style.display = "none";
            dashboardBox.style.display = "block";
            passwordInput.value = "";

            await loadDoctorFilterOptions();
            await loadAppointments();
        } catch (error) {
            console.error("Login error:", error);
            loginError.textContent = "Unable to connect to the server.";
            loginError.style.display = "block";
        } finally {
            dashboardLoginBtn.disabled = false;
            dashboardLoginBtn.textContent = "Login";
        }
    }

    function logout() {
        isLoggedIn = false;
        dashboardAuthPassword = "";

        loginBox.style.display = "block";
        dashboardBox.style.display = "none";

        passwordInput.value = "";
        passwordInput.type = "password";

        const icon = togglePasswordBtn.querySelector("i");
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");

        togglePasswordBtn.setAttribute("aria-label", "Show password");

        loginError.style.display = "none";
        dashboardAppointmentsList.innerHTML = "";
    }

    togglePasswordBtn.addEventListener("click", () => {
        const icon = togglePasswordBtn.querySelector("i");

        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");
            togglePasswordBtn.setAttribute("aria-label", "Hide password");
        } else {
            passwordInput.type = "password";
            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");
            togglePasswordBtn.setAttribute("aria-label", "Show password");
        }
    });

    dashboardLoginBtn.addEventListener("click", login);

    passwordInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            login();
        }
    });

    dashboardLogoutBtn.addEventListener("click", logout);

    async function loadDoctorFilterOptions() {
        if (!isLoggedIn) return;

        try {
            const response = await fetch("/api/doctors");

            if (!response.ok) {
                throw new Error("Failed to load doctors");
            }

            const doctors = await response.json();

            doctorFilter.innerHTML = '<option value="">All Doctors</option>';

            doctors.forEach(doctor => {
                const option = document.createElement("option");
                option.value = doctor.name;
                option.textContent = doctor.name;
                doctorFilter.appendChild(option);
            });
        } catch (error) {
            console.error("Error loading doctors:", error);
        }
    }

    async function updateStatus(appointmentId, status) {
        if (!isLoggedIn || !dashboardAuthPassword) return;

        try {
            const response = await fetch("/api/doctor/update-status", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    appointmentId,
                    status
                })
            });

            const result = await response.json();

            if (response.status === 401) {
                alert("Your login session has expired. Please log in again.");
                logout();
                return;
            }

            if (!response.ok || !result.success) {
                alert(result.message || "Unable to update status.");
                return;
            }

            await loadAppointments();
        } catch (error) {
            console.error("Error updating appointment status:", error);
            alert("Error updating appointment status.");
        }
    }

    async function loadAppointments() {
        if (!isLoggedIn || !dashboardAuthPassword) return;

        dashboardAppointmentsList.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px;">
                    <i class="fa-solid fa-spinner fa-spin"></i> Loading...
                </td>
            </tr>
        `;

        const params = new URLSearchParams();

        if (doctorFilter.value) {
            params.set("doctor", doctorFilter.value);
        }

        if (statusFilter.value) {
            params.set("status", statusFilter.value);
        }

        try {
            const response = await fetch(`/api/doctor/appointments?${params.toString()}`, {
                headers: getAuthHeaders()
            });

            const result = await response.json();

            if (response.status === 401) {
                alert("Your login session has expired. Please log in again.");
                logout();
                return;
            }

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to load appointments");
            }

            const appointments = result.appointments || [];

            if (appointments.length === 0) {
                dashboardAppointmentsList.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 20px;">
                            <i class="fa-regular fa-calendar-xmark"></i> No appointments found.
                        </td>
                    </tr>
                `;
                return;
            }

            const statusColors = {
                Confirmed: "#1e8e3e",
                Completed: "#0056b3",
                Cancelled: "#dc3545"
            };

            dashboardAppointmentsList.innerHTML = "";

            appointments.forEach(appointment => {
                const row = document.createElement("tr");
                row.style.borderBottom = "1px solid #eee";

                const color = statusColors[appointment.status] || "#333";

                row.innerHTML = `
                    <td style="padding: 12px;">${escapeHtml(appointment.appointmentCode)}</td>
                    <td style="padding: 12px;"><strong>${escapeHtml(appointment.fullName)}</strong></td>
                    <td style="padding: 12px;">${escapeHtml(appointment.phone)}</td>
                    <td style="padding: 12px;">${escapeHtml(appointment.doctor)}</td>
                    <td style="padding: 12px;">${formatDate(appointment.date)} (${formatTime(appointment.time)})</td>
                    <td style="padding: 12px; color: ${color}; font-weight: 600;">${escapeHtml(appointment.status)}</td>
                    <td style="padding: 12px;">
                        <select
                            data-id="${appointment.id}"
                            class="status-select"
                            style="padding: 6px; border: 1px solid #ddd; border-radius: 6px;"
                        >
                            <option value="Confirmed" ${appointment.status === "Confirmed" ? "selected" : ""}>Confirmed</option>
                            <option value="Completed" ${appointment.status === "Completed" ? "selected" : ""}>Completed</option>
                            <option value="Cancelled" ${appointment.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
                        </select>
                    </td>
                `;

                dashboardAppointmentsList.appendChild(row);
            });

            document.querySelectorAll(".status-select").forEach(select => {
                select.addEventListener("change", event => {
                    const appointmentId = event.target.getAttribute("data-id");
                    updateStatus(appointmentId, event.target.value);
                });
            });
        } catch (error) {
            console.error("Error loading appointments:", error);

            dashboardAppointmentsList.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 20px;">
                        <i class="fa-solid fa-triangle-exclamation"></i> Unable to load appointments.
                    </td>
                </tr>
            `;
        }
    }

    doctorFilter.addEventListener("change", loadAppointments);
    statusFilter.addEventListener("change", loadAppointments);
    refreshBtn.addEventListener("click", loadAppointments);

    logout();
});
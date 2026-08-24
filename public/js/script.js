document.addEventListener("DOMContentLoaded", () => {
    const doctorListContainer = document.getElementById("doctorListContainer");
    const doctorSelect = document.getElementById("doctor");
    const bookingForm = document.getElementById("bookingForm");
    const recentAppointmentsList = document.getElementById("recentAppointmentsList");
    const searchInput = document.getElementById("searchInput");
    const specialtyFilter = document.getElementById("specialtyFilter");
    const appointmentDate = document.getElementById("date");
    const appointmentTime = document.getElementById("time");
    const appointmentConfirmation = document.getElementById("appointmentConfirmation");
    const confirmationId = document.getElementById("confirmationId");
    const confirmationDoctor = document.getElementById("confirmationDoctor");
    const confirmationSpecialization = document.getElementById("confirmationSpecialization");
    const confirmationDate = document.getElementById("confirmationDate");
    const confirmationTime = document.getElementById("confirmationTime");
    const confirmationPatient = document.getElementById("confirmationPatient");
    const newAppointmentButton = document.getElementById("newAppointmentButton");

    const statusQuery = document.getElementById("statusQuery");
    const checkStatusBtn = document.getElementById("checkStatusBtn");
    const statusResult = document.getElementById("statusResult");

    let allDoctors = [];

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function setMinimumDate() {
        if (!appointmentDate) {
            return;
        }

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        appointmentDate.min = `${year}-${month}-${day}`;
    }

    function populateSpecialtyFilter() {
        if (!specialtyFilter) {
            return;
        }

        const specialties = [...new Set(allDoctors.map(doctor => doctor.specialty).filter(Boolean))].sort();

        specialtyFilter.innerHTML = '<option value="">All Specializations</option>';

        specialties.forEach(specialty => {
            const option = document.createElement("option");
            option.value = specialty;
            option.textContent = specialty;
            specialtyFilter.appendChild(option);
        });
    }

    async function loadDoctors() {
        try {
            const response = await fetch("/api/doctors");

            if (!response.ok) {
                throw new Error("Failed to load doctors");
            }

            allDoctors = await response.json();

            if (doctorSelect) {
                doctorSelect.innerHTML = '<option value="">Choose a Doctor</option>';

                allDoctors.forEach(doctor => {
                    const option = document.createElement("option");
                    option.value = doctor.name;

                    const schedule = doctor.available_days && doctor.available_time
                        ? ` — (${doctor.available_days} | ${doctor.available_time})`
                        : '';

                    option.textContent = `${doctor.name} - ${doctor.specialty}${schedule}`;
                    doctorSelect.appendChild(option);
                });
            }

            populateSpecialtyFilter();

            const params = new URLSearchParams(window.location.search);
            const selectedDoctor = params.get("doctor");

            if (selectedDoctor) {
                const matchingDoctor = allDoctors.find(
                    doc => doc.name.toLowerCase() === selectedDoctor.toLowerCase()
                );
                if (matchingDoctor && doctorSelect) {
                    doctorSelect.value = matchingDoctor.name;
                    updateTimeSlots();
                }
            }
        } catch (error) {
            console.error("Error loading doctors:", error);
        }
    }

    async function updateTimeSlots() {
        if (!appointmentTime) {
            return;
        }

        appointmentTime.innerHTML = '<option value="">Select Time Slot</option>';

        const doctorName = doctorSelect ? doctorSelect.value : "";
        const date = appointmentDate ? appointmentDate.value : "";

        if (!doctorName) {
            return;
        }

        const selectedDoctorObj = allDoctors.find(d => d.name === doctorName);

        if (!selectedDoctorObj || !selectedDoctorObj.available_time) {
            return;
        }

        const times = selectedDoctorObj.available_time
            .split(",")
            .map(t => t.trim())
            .filter(Boolean);

        let bookedTimes = [];

        if (date) {
            try {
                const response = await fetch(`/api/booked-slots?doctor=${encodeURIComponent(doctorName)}&date=${encodeURIComponent(date)}`);

                if (response.ok) {
                    const data = await response.json();
                    bookedTimes = (data.bookedTimes || []).map(t => t.trim());
                }
            } catch (error) {
                console.error("Error loading booked slots:", error);
            }
        }

        times.forEach(t => {
            const isBooked = bookedTimes.includes(t);
            const option = document.createElement("option");
            option.value = t;
            option.textContent = isBooked ? `${t} (Already Booked)` : t;
            option.disabled = isBooked;
            appointmentTime.appendChild(option);
        });
    }

    if (doctorSelect) {
        doctorSelect.addEventListener("change", () => {
            updateTimeSlots();
        });
    }

    if (appointmentDate) {
        appointmentDate.addEventListener("change", () => {
            updateTimeSlots();
        });
    }

    function displayDoctors(doctors) {
        if (!doctorListContainer) return;
        doctorListContainer.innerHTML = "";

        if (doctors.length === 0) {
            doctorListContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <h3>No doctors found</h3>
                    <p>Try searching with another name or specialty.</p>
                </div>
            `;
            return;
        }

        doctors.forEach(doctor => {
            const card = document.createElement("div");
            card.className = "doctor-card";
            const doctorUrl = `appointment.html?doctor=${encodeURIComponent(doctor.name)}`;

            const scheduleInfo = doctor.available_days && doctor.available_time
                ? `<div class="doctor-schedule">
                    <div class="schedule-item"><i class="fa-solid fa-calendar-days"></i> <span>${escapeHtml(doctor.available_days)}</span></div>
                    <div class="schedule-item"><i class="fa-solid fa-clock"></i> <span>${escapeHtml(doctor.available_time)}</span></div>
                   </div>`
                : '';

            card.innerHTML = `
                <div class="doctor-img-box">
                    <img src="images/${escapeHtml(doctor.image_url)}" alt="${escapeHtml(doctor.name)}">
                </div>
                <div class="doctor-card-body">
                    <div class="doctor-card-top">
                        <span class="doctor-badge"><i class="fa-solid fa-circle-check"></i> Available</span>
                    </div>
                    <h3>${escapeHtml(doctor.name)}</h3>
                    <p class="specialty">${escapeHtml(doctor.specialty)}</p>
                    <p class="qualification"><i class="fa-solid fa-graduation-cap"></i> ${escapeHtml(doctor.qualification)}</p>
                    <p class="experience"><i class="fa-regular fa-clock"></i> ${escapeHtml(doctor.experience)}</p>
                    ${scheduleInfo}
                    <a href="${doctorUrl}" class="doctor-book-btn">
                        <span>Book Appointment</span> <i class="fa-solid fa-arrow-right"></i>
                    </a>
                </div>
            `;
            doctorListContainer.appendChild(card);
        });
    }

    function applyDoctorFilters() {
        const searchText = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const specialty = specialtyFilter ? specialtyFilter.value : "";

        const filteredDoctors = allDoctors.filter(doctor => {
            const matchesSearch = !searchText ||
                (doctor.name && doctor.name.toLowerCase().includes(searchText)) ||
                (doctor.specialty && doctor.specialty.toLowerCase().includes(searchText)) ||
                (doctor.expertise && doctor.expertise.toLowerCase().includes(searchText));

            const matchesSpecialty = !specialty || doctor.specialty === specialty;

            return matchesSearch && matchesSpecialty;
        });

        displayDoctors(filteredDoctors);
    }

    if (searchInput) {
        searchInput.addEventListener("input", applyDoctorFilters);
    }

    if (specialtyFilter) {
        specialtyFilter.addEventListener("change", applyDoctorFilters);
    }

    async function loadAppointments() {
        if (!recentAppointmentsList) return;
        try {
            const response = await fetch("/api/appointments");
            if (!response.ok) throw new Error("Failed to load appointments");

            const appointments = await response.json();
            recentAppointmentsList.innerHTML = "";

            if (appointments.length === 0) {
                recentAppointmentsList.innerHTML = `
                    <tr>
                        <td colspan="5" class="no-data" style="text-align: center; padding: 20px;">
                            <i class="fa-regular fa-calendar-xmark"></i> No appointments found yet.
                        </td>
                    </tr>
                `;
                return;
            }

            const statusStyles = {
                Confirmed: { bg: "#e6f4ea", color: "#1e8e3e", icon: "fa-circle-check" },
                Completed: { bg: "#e7f1ff", color: "#0056b3", icon: "fa-square-check" },
                Cancelled: { bg: "#fdeaea", color: "#dc3545", icon: "fa-circle-xmark" }
            };

            appointments.forEach(appointment => {
                const row = document.createElement("tr");
                const displayId = appointment.appointmentCode || appointment.id || 'N/A';
                const style = statusStyles[appointment.status] || statusStyles.Confirmed;

                row.innerHTML = `
                    <td style="padding: 14px 16px; vertical-align: middle;">${escapeHtml(displayId)}</td>
                    <td style="padding: 14px 16px; vertical-align: middle;"><strong>${escapeHtml(appointment.fullName)}</strong></td>
                    <td style="padding: 14px 16px; vertical-align: middle;">${escapeHtml(appointment.doctor)}</td>
                    <td style="padding: 14px 16px; vertical-align: middle;">${formatDate(appointment.date)} (${formatTime(appointment.time)})</td>
                    <td style="padding: 14px 16px; vertical-align: middle;"><span class="status-badge" style="background: ${style.bg}; color: ${style.color}; padding: 5px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; display: inline-flex; align-items: center; gap: 5px;"><i class="fa-solid ${style.icon}"></i> ${escapeHtml(appointment.status)}</span></td>
                `;
                recentAppointmentsList.appendChild(row);
            });
        } catch (error) {
            console.error(error);
            recentAppointmentsList.innerHTML = `
                <tr>
                    <td colspan="5" class="no-data" style="text-align: center; padding: 20px;">
                        <i class="fa-solid fa-triangle-exclamation"></i> Unable to load appointments.
                    </td>
                </tr>
            `;
        }
    }

    function formatDate(date) {
        if (!date) return "";
        const formatted = new Date(date);
        if (Number.isNaN(formatted.getTime())) return date;
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
        if (parts.length < 2) return value;
        const hours = Number(parts[0]);
        const minutes = parts[1];
        const suffix = hours >= 12 ? "PM" : "AM";
        const displayHour = hours % 12 || 12;
        return `${displayHour}:${minutes} ${suffix}`;
    }

    function showConfirmation(result, formData) {
        if (!appointmentConfirmation) {
            alert(`Appointment booked successfully!\nAppointment ID: ${result.appointmentCode}`);
            return;
        }

        const selectedDoctorObj = allDoctors.find(d => d.name === formData.doctor);

        confirmationId.textContent = result.appointmentCode || `MB-${result.appointmentId}`;
        confirmationDoctor.textContent = formData.doctor;
        if (confirmationSpecialization) {
            confirmationSpecialization.textContent = selectedDoctorObj ? selectedDoctorObj.specialty : "N/A";
        }
        confirmationDate.textContent = formatDate(formData.date);
        confirmationTime.textContent = formatTime(formData.time);
        confirmationPatient.textContent = formData.fullName;

        bookingForm.classList.add("is-hidden");
        appointmentConfirmation.style.display = "block";

        appointmentConfirmation.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    if (newAppointmentButton) {
        newAppointmentButton.addEventListener("click", () => {
            bookingForm.reset();
            bookingForm.classList.remove("is-hidden");
            appointmentConfirmation.style.display = "none";
            setMinimumDate();
            if (appointmentTime) {
                appointmentTime.innerHTML = '<option value="">Select Time Slot</option>';
            }

            const params = new URLSearchParams(window.location.search);
            const selectedDoctor = params.get("doctor");

            if (selectedDoctor && doctorSelect) {
                const matchingDoctor = allDoctors.find(
                    doctor => doctor.name.toLowerCase() === selectedDoctor.toLowerCase()
                );

                if (matchingDoctor) {
                    doctorSelect.value = matchingDoctor.name;
                    updateTimeSlots();
                }
            }

            bookingForm.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        });
    }

    if (bookingForm) {
        bookingForm.addEventListener("submit", async event => {
            event.preventDefault();

            const submitButton = bookingForm.querySelector(".btn-submit");

            const formData = {
                fullName: document.getElementById("name").value.trim(),
                email: document.getElementById("email").value.trim(),
                phone: document.getElementById("phone").value.trim(),
                doctor: document.getElementById("doctor").value,
                date: document.getElementById("date").value,
                time: document.getElementById("time").value
            };

            if (!formData.fullName || !formData.email || !formData.phone || !formData.doctor || !formData.date || !formData.time) {
                alert("Please complete all appointment fields.");
                return;
            }

            const phonePattern = /^(?:\+8801|01)[3-9]\d{8}$/;
            if (!phonePattern.test(formData.phone.replace(/[\s-]/g, ""))) {
                alert("Please enter a valid Bangladesh phone number.");
                return;
            }

            const [year, month, day] = formData.date.split("-").map(Number);
            const selectedDateObj = new Date(year, month - 1, day);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDateObj < today) {
                alert("Please select a future appointment date.");
                return;
            }

            const selectedDoctorObj = allDoctors.find(d => d.name === formData.doctor);
            if (selectedDoctorObj && selectedDoctorObj.available_days) {
                const daysMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                const selectedDayName = daysMap[selectedDateObj.getDay()];

                const availableDaysList = selectedDoctorObj.available_days.split(",").map(d => d.trim().toLowerCase());
                const isDayAvailable = availableDaysList.includes(selectedDayName.toLowerCase());

                if (!isDayAvailable) {
                    alert(`${selectedDoctorObj.name} is not available on this day (${selectedDayName}).\nAvailable days: ${selectedDoctorObj.available_days}`);
                    return;
                }
            }

            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Booking Appointment...';

            try {
                const response = await fetch("/api/book-appointment", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.message || "Appointment booking failed");
                }

                showConfirmation(result, formData);
                await loadAppointments();
                await updateTimeSlots();
            } catch (error) {
                console.error(error);
                alert(error.message || "Unable to book appointment.");
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Confirm Appointment';
            }
        });
    }

    function renderFoundAppointment(found) {
        const isCancelled = found.status === "Cancelled";
        const phoneGuess = /^(?:\+8801|01)[3-9]\d{8}$/.test(statusQuery.value.trim().replace(/[\s-]/g, ""))
            ? statusQuery.value.trim()
            : "";

        statusResult.innerHTML = `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #28a745; margin-top: 10px;">
                <p style="margin: 0 0 8px; color: #28a745; font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Appointment Found!</p>
                <p style="margin: 4px 0;"><strong>ID:</strong> ${escapeHtml(found.appointmentCode)}</p>
                <p style="margin: 4px 0;"><strong>Patient:</strong> ${escapeHtml(found.fullName)}</p>
                <p style="margin: 4px 0;"><strong>Doctor:</strong> ${escapeHtml(found.doctor)}</p>
                <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${formatDate(found.date)} at ${formatTime(found.time)}</p>
                <p style="margin: 4px 0;"><strong>Status:</strong> ${escapeHtml(found.status)}</p>

                <div style="margin-top: 15px;">
                    <label style="display: block; margin-bottom: 6px; font-size: 13px; color: #555;">Confirm your phone number to cancel or reschedule</label>
                    <input type="tel" id="verifyPhone" value="${escapeHtml(phoneGuess)}" placeholder="017xxxxxxxx" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; margin-bottom: 10px;">
                </div>

                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    ${isCancelled ? "" : `<button type="button" id="cancelApptBtn" style="padding: 10px 16px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Cancel Appointment</button>`}
                    <button type="button" id="rescheduleApptBtn" style="padding: 10px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Reschedule</button>
                </div>

                <div id="rescheduleFormBox" style="display: none; margin-top: 15px; border-top: 1px solid #ddd; padding-top: 15px;">
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <input type="date" id="rescheduleDate" style="flex: 1; min-width: 140px; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                        <select id="rescheduleTime" style="flex: 1; min-width: 140px; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">Select Time Slot</option>
                        </select>
                    </div>
                    <button type="button" id="confirmRescheduleBtn" style="margin-top: 10px; padding: 10px 16px; background: #0056b3; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Confirm Reschedule</button>
                </div>
            </div>
        `;

        const verifyPhone = document.getElementById("verifyPhone");
        const cancelApptBtn = document.getElementById("cancelApptBtn");
        const rescheduleApptBtn = document.getElementById("rescheduleApptBtn");
        const rescheduleFormBox = document.getElementById("rescheduleFormBox");
        const rescheduleDate = document.getElementById("rescheduleDate");
        const rescheduleTime = document.getElementById("rescheduleTime");
        const confirmRescheduleBtn = document.getElementById("confirmRescheduleBtn");

        const todayStr = new Date().toISOString().split("T")[0];
        if (rescheduleDate) {
            rescheduleDate.min = todayStr;
        }

        if (cancelApptBtn) {
            cancelApptBtn.addEventListener("click", async () => {
                const phone = verifyPhone.value.trim();
                if (!phone) {
                    alert("Please enter your phone number to confirm.");
                    return;
                }

                if (!confirm("Are you sure you want to cancel this appointment?")) {
                    return;
                }

                try {
                    const response = await fetch("/api/cancel-appointment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ appointmentId: found.id, phone })
                    });
                    const result = await response.json();

                    if (!response.ok || !result.success) {
                        alert(result.message || "Unable to cancel appointment.");
                        return;
                    }

                    alert("Appointment cancelled successfully.");
                    found.status = "Cancelled";
                    renderFoundAppointment(found);
                    await loadAppointments();
                } catch (err) {
                    console.error(err);
                    alert("Error cancelling appointment.");
                }
            });
        }

        if (rescheduleApptBtn) {
            rescheduleApptBtn.addEventListener("click", async () => {
                const isVisible = rescheduleFormBox.style.display === "block";
                rescheduleFormBox.style.display = isVisible ? "none" : "block";

                if (!isVisible && rescheduleDate.value) {
                    await loadRescheduleTimeSlots(found, rescheduleDate.value, rescheduleTime);
                }
            });
        }

        if (rescheduleDate) {
            rescheduleDate.addEventListener("change", () => {
                loadRescheduleTimeSlots(found, rescheduleDate.value, rescheduleTime);
            });
        }

        if (confirmRescheduleBtn) {
            confirmRescheduleBtn.addEventListener("click", async () => {
                const phone = verifyPhone.value.trim();
                const newDate = rescheduleDate.value;
                const newTime = rescheduleTime.value;

                if (!phone) {
                    alert("Please enter your phone number to confirm.");
                    return;
                }

                if (!newDate || !newTime) {
                    alert("Please select a new date and time slot.");
                    return;
                }

                try {
                    const response = await fetch("/api/reschedule-appointment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            appointmentId: found.id,
                            phone,
                            date: newDate,
                            time: newTime
                        })
                    });
                    const result = await response.json();

                    if (!response.ok || !result.success) {
                        alert(result.message || "Unable to reschedule appointment.");
                        return;
                    }

                    alert("Appointment rescheduled successfully.");
                    found.date = newDate;
                    found.time = newTime;
                    found.status = "Confirmed";
                    renderFoundAppointment(found);
                    await loadAppointments();
                    await updateTimeSlots();
                } catch (err) {
                    console.error(err);
                    alert("Error rescheduling appointment.");
                }
            });
        }
    }

    async function loadRescheduleTimeSlots(found, date, selectEl) {
        selectEl.innerHTML = '<option value="">Select Time Slot</option>';

        const doctorObj = allDoctors.find(d => d.name === found.doctor);
        if (!doctorObj || !doctorObj.available_time) {
            return;
        }

        const times = doctorObj.available_time
            .split(",")
            .map(t => t.trim())
            .filter(Boolean);

        let bookedTimes = [];
        try {
            const response = await fetch(`/api/booked-slots?doctor=${encodeURIComponent(found.doctor)}&date=${encodeURIComponent(date)}`);
            if (response.ok) {
                const data = await response.json();
                bookedTimes = (data.bookedTimes || []).map(t => t.trim());
            }
        } catch (error) {
            console.error("Error loading booked slots:", error);
        }

        const originalDateStr = String(found.date).split("T")[0];
        if (date === originalDateStr) {
            bookedTimes = bookedTimes.filter(t => t !== String(found.time).trim());
        }

        times.forEach(t => {
            const isBooked = bookedTimes.includes(t);
            const option = document.createElement("option");
            option.value = t;
            option.textContent = isBooked ? `${t} (Already Booked)` : t;
            option.disabled = isBooked;
            selectEl.appendChild(option);
        });
    }

    if (checkStatusBtn && statusQuery && statusResult) {
        checkStatusBtn.addEventListener("click", async () => {
            const query = statusQuery.value.trim();
            if (!query) {
                alert("Please enter an Appointment ID or Phone Number.");
                return;
            }

            statusResult.innerHTML = '<p style="color: #0056b3;"><i class="fa-solid fa-spinner fa-spin"></i> Searching...</p>';

            try {
                const response = await fetch(`/api/appointment-status?query=${encodeURIComponent(query)}`);
                const result = await response.json();

                if (result.success && result.appointment) {
                    renderFoundAppointment(result.appointment);
                } else {
                    statusResult.innerHTML = `
                        <div style="background: #fff3f3; padding: 15px; border-radius: 8px; border: 1px solid #dc3545; margin-top: 10px;">
                            <p style="margin: 0; color: #dc3545;"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(result.message || "No appointment found with this ID or Phone Number.")}</p>
                        </div>
                    `;
                }
            } catch (err) {
                console.error(err);
                statusResult.innerHTML = '<p style="color: red;">Error checking appointment status.</p>';
            }
        });
    }

    setMinimumDate();
    loadDoctors().then(() => {
        displayDoctors(allDoctors);
    });
    loadAppointments();
});
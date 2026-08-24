const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();

const DASHBOARD_PASSWORD = "medibook2026";

function requireDashboardAuth(req, res, next) {
    const providedPassword = req.headers["x-dashboard-password"];

    if (providedPassword !== DASHBOARD_PASSWORD) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized. Please log in again."
        });
    }

    next();
}

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "medibook_bd",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((error, connection) => {
    if (error) {
        console.error("Database connection failed:", error.message);
        return;
    }
    console.log("Connected to MySQL Database!");
    connection.release();
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/contact-page", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "contact.html"));
});

app.get("/about-page", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "about.html"));
});

app.get("/doctors-page", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "doctors.html"));
});

app.get("/appointment-page", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "appointment.html"));
});

app.get("/doctor-dashboard-page", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "doctor-dashboard.html"));
});

app.get("/api/doctors", (req, res) => {
    const sql = "SELECT * FROM doctors ORDER BY id ASC";

    db.query(sql, (error, results) => {
        if (error) {
            console.error("Doctor fetch error:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to load doctors."
            });
        }

        res.json(results);
    });
});

app.get("/api/booked-slots", (req, res) => {
    const { doctor, date } = req.query;

    if (!doctor || !date) {
        return res.status(400).json({
            success: false,
            message: "Doctor and date are required."
        });
    }

    const sql = `
        SELECT appointment_time
        FROM appointments
        WHERE doctor_name = ? AND appointment_date = ? AND status != 'Cancelled'
    `;

    db.query(sql, [doctor, date], (error, results) => {
        if (error) {
            console.error("Booked slots fetch error:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to load booked slots."
            });
        }

        const bookedTimes = results.map(row => String(row.appointment_time).trim());
        res.json({ success: true, bookedTimes });
    });
});

app.get("/api/appointments", (req, res) => {
    const sql = `
        SELECT
            id,
            patient_name AS fullName,
            doctor_name AS doctor,
            appointment_date AS date,
            appointment_time AS time,
            status
        FROM appointments
        ORDER BY id DESC
        LIMIT 10
    `;

    db.query(sql, (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message: "Unable to load appointments."
            });
        }

        const formattedResults = results.map(item => ({
            ...item,
            appointmentCode: `MB-${new Date(item.date).getFullYear()}-${String(item.id).padStart(4, "0")}`
        }));

        res.json(formattedResults);
    });
});

app.get("/api/appointment-status", (req, res) => {
    const query = String(req.query.query || "").trim();

    if (!query) {
        return res.status(400).json({
            success: false,
            message: "Please provide an Appointment ID or Phone Number."
        });
    }

    let idGuess = 0;
    const trailingDigits = query.match(/(\d+)\s*$/);
    if (trailingDigits) {
        idGuess = Number(trailingDigits[1]);
    }

    const sql = `
        SELECT
            id,
            patient_name AS fullName,
            doctor_name AS doctor,
            appointment_date AS date,
            appointment_time AS time,
            status
        FROM appointments
        WHERE patient_phone = ? OR id = ?
        ORDER BY id DESC
        LIMIT 1
    `;

    db.query(sql, [query, idGuess], (error, results) => {
        if (error) {
            console.error("Appointment status error:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to check appointment status."
            });
        }

        if (results.length === 0) {
            return res.json({
                success: false,
                message: "No appointment found with this ID or Phone Number."
            });
        }

        const appointment = results[0];
        appointment.appointmentCode = `MB-${new Date(appointment.date).getFullYear()}-${String(appointment.id).padStart(4, "0")}`;

        res.json({ success: true, appointment });
    });
});

function checkDoctorAvailability(selectedDoctor, date, time) {
    const selectedDate = new Date(`${date}T00:00:00`);

    if (Number.isNaN(selectedDate.getTime())) {
        return { ok: false, message: "Invalid appointment date." };
    }

    const selectedDay = selectedDate
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();

    const availableDays = String(selectedDoctor.available_days || "")
        .split(",")
        .map(day => day.trim().toLowerCase())
        .filter(Boolean);

    const dayAvailable = availableDays.some(day => {
        return (
            day === selectedDay ||
            day.substring(0, 3) === selectedDay.substring(0, 3)
        );
    });

    if (!dayAvailable) {
        return {
            ok: false,
            message: `${selectedDoctor.name} is not available on ${selectedDay}. Available days: ${selectedDoctor.available_days}`
        };
    }

    const availableTimes = String(selectedDoctor.available_time || "")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);

    if (
        availableTimes.length > 0 &&
        !availableTimes.some(
            availableTime => availableTime.toLowerCase() === String(time).trim().toLowerCase()
        )
    ) {
        return {
            ok: false,
            message: `Selected time is not available for ${selectedDoctor.name}. Available time: ${selectedDoctor.available_time}`
        };
    }

    return { ok: true };
}

app.post("/api/book-appointment", (req, res) => {
    const {
        fullName,
        email,
        phone,
        doctor,
        date,
        time
    } = req.body;

    if (!fullName || !email || !phone || !doctor || !date || !time) {
        return res.status(400).json({
            success: false,
            message: "Please fill in all appointment fields."
        });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^(?:\+8801|01)[3-9]\d{8}$/;

    if (!emailPattern.test(email)) {
        return res.status(400).json({
            success: false,
            message: "Please enter a valid email address."
        });
    }

    if (!phonePattern.test(phone.replace(/[\s-]/g, ""))) {
        return res.status(400).json({
            success: false,
            message: "Please enter a valid Bangladesh phone number."
        });
    }

    const doctorSql = `
        SELECT
            name,
            available_days,
            available_time
        FROM doctors
        WHERE name = ?
        LIMIT 1
    `;

    db.query(doctorSql, [doctor], (doctorError, doctorResults) => {
        if (doctorError) {
            console.error(doctorError);
            return res.status(500).json({
                success: false,
                message: "Unable to verify doctor."
            });
        }

        if (doctorResults.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Selected doctor was not found."
            });
        }

        const selectedDoctor = doctorResults[0];
        const availability = checkDoctorAvailability(selectedDoctor, date, String(time).trim());

        if (!availability.ok) {
            return res.status(400).json({
                success: false,
                message: availability.message
            });
        }

        const conflictSql = `
            SELECT id FROM appointments
            WHERE doctor_name = ? AND appointment_date = ? AND appointment_time = ? AND status != 'Cancelled'
        `;

        db.query(conflictSql, [doctor, date, String(time).trim()], (conflictError, conflictResults) => {
            if (conflictError) {
                console.error(conflictError);
                return res.status(500).json({
                    success: false,
                    message: "Unable to verify slot availability."
                });
            }

            if (conflictResults.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "This time slot has already been booked. Please choose another slot."
                });
            }

            const sql = `
                INSERT INTO appointments
                (
                    patient_name,
                    patient_email,
                    patient_phone,
                    doctor_name,
                    appointment_date,
                    appointment_time,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, 'Confirmed')
            `;

            db.query(
                sql,
                [fullName, email, phone, doctor, date, String(time).trim()],
                (error, result) => {
                    if (error) {
                        console.error(error);
                        return res.status(500).json({
                            success: false,
                            message: "Appointment could not be saved."
                        });
                    }

                    const appointmentCode =
                        `MB-${new Date().getFullYear()}-${String(result.insertId).padStart(4, "0")}`;

                    res.json({
                        success: true,
                        appointmentId: result.insertId,
                        appointmentCode
                    });
                }
            );
        });
    });
});

app.post("/api/cancel-appointment", (req, res) => {
    const { appointmentId, phone } = req.body;

    if (!appointmentId || !phone) {
        return res.status(400).json({
            success: false,
            message: "Appointment ID and phone number are required."
        });
    }

    const findSql = `
        SELECT id, status FROM appointments
        WHERE id = ? AND patient_phone = ?
        LIMIT 1
    `;

    db.query(findSql, [appointmentId, phone], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message: "Unable to process cancellation."
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No matching appointment found for this ID and phone number."
            });
        }

        if (results[0].status === "Cancelled") {
            return res.json({
                success: false,
                message: "This appointment is already cancelled."
            });
        }

        const updateSql = `UPDATE appointments SET status = 'Cancelled' WHERE id = ?`;

        db.query(updateSql, [appointmentId], updateError => {
            if (updateError) {
                console.error(updateError);
                return res.status(500).json({
                    success: false,
                    message: "Unable to cancel appointment."
                });
            }

            res.json({ success: true, message: "Appointment cancelled successfully." });
        });
    });
});

app.post("/api/reschedule-appointment", (req, res) => {
    const { appointmentId, phone, date, time } = req.body;

    if (!appointmentId || !phone || !date || !time) {
        return res.status(400).json({
            success: false,
            message: "Appointment ID, phone number, new date and time are required."
        });
    }

    const findSql = `
        SELECT id, doctor_name, status FROM appointments
        WHERE id = ? AND patient_phone = ?
        LIMIT 1
    `;

    db.query(findSql, [appointmentId, phone], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message: "Unable to process reschedule."
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No matching appointment found for this ID and phone number."
            });
        }

        const existingAppointment = results[0];

        const doctorSql = `
            SELECT name, available_days, available_time
            FROM doctors
            WHERE name = ?
            LIMIT 1
        `;

        db.query(doctorSql, [existingAppointment.doctor_name], (doctorError, doctorResults) => {
            if (doctorError) {
                console.error(doctorError);
                return res.status(500).json({
                    success: false,
                    message: "Unable to verify doctor."
                });
            }

            if (doctorResults.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Doctor for this appointment was not found."
                });
            }

            const selectedDoctor = doctorResults[0];
            const availability = checkDoctorAvailability(selectedDoctor, date, String(time).trim());

            if (!availability.ok) {
                return res.status(400).json({
                    success: false,
                    message: availability.message
                });
            }

            const conflictSql = `
                SELECT id FROM appointments
                WHERE doctor_name = ? AND appointment_date = ? AND appointment_time = ? AND status != 'Cancelled' AND id != ?
            `;

            db.query(
                conflictSql,
                [existingAppointment.doctor_name, date, String(time).trim(), appointmentId],
                (conflictError, conflictResults) => {
                    if (conflictError) {
                        console.error(conflictError);
                        return res.status(500).json({
                            success: false,
                            message: "Unable to verify slot availability."
                        });
                    }

                    if (conflictResults.length > 0) {
                        return res.status(409).json({
                            success: false,
                            message: "This time slot has already been booked. Please choose another slot."
                        });
                    }

                    const updateSql = `
                        UPDATE appointments
                        SET appointment_date = ?, appointment_time = ?, status = 'Confirmed'
                        WHERE id = ?
                    `;

                    db.query(
                        updateSql,
                        [date, String(time).trim(), appointmentId],
                        updateError => {
                            if (updateError) {
                                console.error(updateError);
                                return res.status(500).json({
                                    success: false,
                                    message: "Unable to reschedule appointment."
                                });
                            }

                            const appointmentCode = `MB-${new Date(date).getFullYear()}-${String(appointmentId).padStart(4, "0")}`;

                            res.json({
                                success: true,
                                message: "Appointment rescheduled successfully.",
                                appointmentCode
                            });
                        }
                    );
                }
            );
        });
    });
});

app.post("/api/doctor/login", (req, res) => {
    const { password } = req.body;

    if (password !== DASHBOARD_PASSWORD) {
        return res.status(401).json({
            success: false,
            message: "Incorrect password."
        });
    }

    res.json({ success: true });
});

app.get("/api/doctor/appointments", requireDashboardAuth, (req, res) => {
    const { doctor, status } = req.query;

    let sql = `
        SELECT
            id,
            patient_name AS fullName,
            patient_phone AS phone,
            doctor_name AS doctor,
            appointment_date AS date,
            appointment_time AS time,
            status
        FROM appointments
        WHERE 1 = 1
    `;
    const params = [];

    if (doctor) {
        sql += " AND doctor_name = ?";
        params.push(doctor);
    }

    if (status) {
        sql += " AND status = ?";
        params.push(status);
    }

    sql += " ORDER BY appointment_date DESC, id DESC";

    db.query(sql, params, (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message: "Unable to load appointments."
            });
        }

        const formattedResults = results.map(item => ({
            ...item,
            appointmentCode: `MB-${new Date(item.date).getFullYear()}-${String(item.id).padStart(4, "0")}`
        }));

        res.json({ success: true, appointments: formattedResults });
    });
});

app.post("/api/doctor/update-status", requireDashboardAuth, (req, res) => {
    const { appointmentId, status } = req.body;
    const allowedStatuses = ["Confirmed", "Completed", "Cancelled"];

    if (!appointmentId || !allowedStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: "A valid appointment ID and status are required."
        });
    }

    const updateSql = `UPDATE appointments SET status = ? WHERE id = ?`;

    db.query(updateSql, [status, appointmentId], (error, result) => {
        if (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message: "Unable to update appointment status."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found."
            });
        }

        res.json({ success: true, message: "Status updated successfully." });
    });
});

app.listen(3000, () => {
    console.log("MediBook BD is running on http://localhost:3000");
});
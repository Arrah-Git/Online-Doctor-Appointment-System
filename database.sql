CREATE DATABASE IF NOT EXISTS medibook_bd;
USE medibook_bd;

CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255) NOT NULL,
    qualification VARCHAR(255) NOT NULL,
    experience VARCHAR(50) NOT NULL,
    expertise TEXT NOT NULL,
    available_days VARCHAR(255) NOT NULL,
    available_time VARCHAR(255) NOT NULL,
    image_url VARCHAR(255)
);


CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_name VARCHAR(255) NOT NULL,
    patient_email VARCHAR(255) NOT NULL,
    patient_phone VARCHAR(50) NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Confirmed'
);


INSERT INTO doctors (id, name, specialty, qualification, experience, expertise, available_days, available_time, image_url) VALUES
(1, 'Dr. Fahim Rahman', 'Cardiologist', 'MBBS, FCPS', '10 Years Experience', 'Heart Disease, Chest Pain, Hypertension', 'Saturday, Monday, Wednesday', '10:00 AM, 11:00 AM, 12:00 PM, 01:00 PM', 'doctor-1.jpg'),
(2, 'Dr. Nusrat Jahan', 'Dermatologist', 'MBBS, DDV', '7 Years Experience', 'Skin Allergy, Acne, Hair Fall', 'Sunday, Tuesday, Thursday', '04:00 PM, 05:00 PM, 06:00 PM, 07:00 PM', 'doctor-2.jpg'),
(3, 'Dr. Tanvir Ahmed', 'Neurologist', 'MBBS, MD', '12 Years Experience', 'Headache, Stroke, Paralysis', 'Saturday, Wednesday', '11:00 AM, 12:00 PM, 01:00 PM, 02:00 PM', 'doctor-3.jpg'),
(4, 'Dr. Sadia Karim', 'Pediatrician', 'MBBS, DCH', '8 Years Experience', 'Child Nutrition, Vaccination, Fever', 'Monday, Thursday, Saturday', '03:00 PM, 04:00 PM, 05:00 PM, 06:00 PM', 'doctor-4.jpg'),
(5, 'Dr. Arif Hossain', 'Orthopedic', 'MBBS, MS (Ortho)', '9 Years Experience', 'Bone Fracture, Joint Pain, Back Pain', 'Sunday, Tuesday, Thursday', '05:00 PM, 06:00 PM, 07:00 PM, 08:00 PM', 'doctor-arif.jpg'),
(6, 'Dr. Mehedi Hasan', 'Medicine Specialist', 'MBBS, FCPS (Medicine)', '11 Years Experience', 'Diabetes, Fever, High Blood Pressure', 'Saturday, Monday, Wednesday', '09:00 AM, 10:00 AM, 11:00 AM, 12:00 PM', 'doctor-mehedi.jpg'),
(7, 'Dr. Farzana Rahman', 'Gynecologist', 'MBBS, FCPS (OBGYN)', '10 Years Experience', 'Pregnancy Care, Women Health, Infertility', 'Sunday, Tuesday, Friday', '04:00 PM, 05:00 PM, 06:00 PM, 07:00 PM', 'doctor-farzana.jpg'),
(8, 'Dr. Nusrat Ahmed', 'ENT Specialist', 'MBBS, DLO', '6 Years Experience', 'Ear Infection, Sinusitis, Tonsil', 'Monday, Wednesday, Friday', '10:00 AM, 11:00 AM, 12:00 PM, 01:00 PM', 'doctor-nusrat-ahmed.jpg');
# Software Requirements Specification (SRS) 

Study Assistant Progressive Web Application (PWA) 

**Revision history** 

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2025-09-09 | Initial SRS (native mobile application) |
| 1.1 | 2026-10-03 | Platform changed from a native mobile app to a Progressive Web App (PWA). Authentication extended with Google sign-in, email verification, password reset, profile and password change. |

## **1. Introduction** 

### **1.1 Purpose** 

The purpose of this document is to provide a detailed description of the requirements for the Study Assistant Progressive Web Application (PWA). This application is designed to help students manage tasks, summarize academic materials, and enhance learning through interactive tools such as flashcards and quizzes. 

### **1.2 Scope** 

The system will allow users to create and manage tasks, upload and summarize PDF documents, and study using flashcards and quiz modes. The application is delivered as a Progressive Web App: it runs in any modern web browser, is designed mobile-first, can be installed to the home screen of phones, tablets and computers without an app store, and is supported by a backend API. 

### **1.3 Definitions** 

- SRS: Software Requirements Specification 
- PWA: Progressive Web App, a web application that can be installed on a device and offers app-like features such as an offline app shell, using a web app manifest and a service worker 
- API: Application Programming Interface 
- JWT: JSON Web Token, used to authenticate API requests 
- OAuth / Google Sign-In: Signing in with an existing Google account instead of a password 
- Flashcard: A card containing a question and answer used for study 
- Quiz Session: An interactive session where users answer questions 

### **1.4 Overview** 

This document outlines the overall system description, system features, non-functional requirements, and external interface requirements. 

## **2. Overall Description** 

### **2.1 Product Perspective** 

The Study Assistant is a standalone system consisting of a Progressive Web App frontend (Next.js) and a backend server (Django REST Framework API with a PostgreSQL database). It integrates with third-party AI services for PDF summarization and with Google as an identity provider for social sign-in. 

### **2.2 Product Functions** 

- User authentication (email/password and Google sign-in) 

- Task and schedule management 

- To-do list management 

- PDF summarization 

- Flashcard creation and management 

- Quiz mode 

### **2.3 User Characteristics** 

The primary users are students with basic knowledge of using a web browser. They are expected to be familiar with web and mobile applications. 

### **2.4 Constraints** 

- Requires internet for PDF summarization and Google sign-in 

- Browser platform limitations (e.g. differing PWA support across browsers, such as limited storage and notification support on iOS Safari) 

- API rate limits 

### **2.5 Assumptions** 

- Users have a device with a modern web browser (smartphone, tablet or computer) 

- Users have internet access 

- PDFs are readable 

## **3. System Features** 

### **3.1 User Authentication** 

- User can create an account with email and password 

- User must verify their email address before logging in with a password 

- User can log in with email and password 

- User can sign up and log in with their Google account 

- User receives authentication token 

- User can log out 

- User can reset a forgotten password via email 

- User can view and update their profile and change their password 

### **3.2 To-Do List** 

- Add task 

- Edit task 

- Delete task 

- Mark task as completed 

### **3.3 Task & Schedule Manager** 

- Create task with deadline 

- Assign priority 

- View tasks by date 

### **3.4 PDF Summarizer** 

- Upload PDF 

- Extract text 

- Generate summary 

- Display summary 

### **3.5 Flashcards** 

- Create flashcard 

- Edit flashcard 

- Delete flashcard 

- View flashcards by subject 

### **3.6 Quiz Mode** 

- Start quiz 

- Answer questions 

- View score 

## **4. Non-Functional Requirements** 

Performance: The system should respond within 2–3 seconds. Usability: The interface should be clean, intuitive, responsive and mobile-first. Security: JWT authentication, password encryption, and verification of Google identity tokens. Reliability: The system should handle errors gracefully. Scalability: The backend should support multiple users. Installability: The application should be installable as a PWA and load its app shell when offline. 

## **5. External Interface Requirements** 

User Interface: Responsive, mobile-first web interface delivered as a Progressive Web App. Hardware Interface: Any device with a modern web browser (smartphones, tablets, computers). Software Interface: Backend REST API, AI services, and Google Identity Services (OAuth 2.0 / OpenID Connect). 

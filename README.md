# Notarial Register Management System (NRMS)

The Notarial Register Management System (NRMS) is a web-based system developed for Ocasion Law Office and Notary Public to digitally manage and organize notarial transactions and records. The system streamlines the notarization workflow from client intake, draft preparation, entry finalization, up to official notarial book recording.

# User Roles
## Admin
Full system access
Manage users
Manage books and entries
Generate reports and PDF exports
Archive and restore records
Monitor audit logs
## Secretary
Manage client queuing and intake
Prepare draft entries
Encode party, witness, and ID information
Manage pending notarization records
## Attorney
Review and finalize notarization entries
Validate notarization details
Automatically record finalized entries into the official notarial register
# Key Features
Client Queuing & Intake Management
Draft Entry Workflow
Entry Finalization Process
Automatic Entry Numbering
Automatic Page Assignment (5 entries per page)
Automatic Book Assignment (525 entries per book)
Multiple Parties and Witnesses Support
Competent Evidence of Identity Management
Search and Filter Records
Archive & Restore Entries and Books
PDF Export of Notarial Books and Entries
Audit Logs and Activity Tracking
Role-Based Access Control
Technologies Used
Backend: Django REST Framework
Database: SQLite
Frontend: React / Next.js
API: RESTful API Architecture
System Workflow
Secretary registers the client through the intake and queuing module.
Draft notarization details are prepared.
Attorney reviews and finalizes the notarization.
The system automatically assigns:
Entry Number
Page Number
Book Number
Finalized records are stored in the official notarial register.
Users may search, export, archive, or restore records when needed.

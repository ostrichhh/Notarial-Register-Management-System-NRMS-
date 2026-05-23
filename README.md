# Notarial Register Management System (NRMS)

## Overview
The Notarial Register Management System (NRMS) is a web-based system for Ocasion Law Office and Notary Public that manages notarial transactions and records from client intake to final register entry.

## User Roles

### Admin
- Full system access  
- Manage users, books, and entries  
- Generate reports and PDF exports  
- Archive and restore records  
- Monitor audit logs  

### Secretary
- Client intake and queuing  
- Prepare draft entries  
- Encode party, witness, and ID details  
- Manage pending records  

### Attorney
- Review and finalize entries  
- Validate notarization details  
- Approve official register recording  

## Key Features
- Client queuing and intake  
- Draft entry workflow  
- Entry finalization  
- Automatic entry, page, and book numbering  
- Multiple parties and witnesses support  
- ID management  
- Search and filtering  
- Archive and restore  
- PDF export  
- Audit logs  
- Role-based access  

## Technologies Used
- Backend: Django REST Framework  
- Frontend: React.js  
- Database: SQLite  
- API: REST-style JSON API
  
## System Workflow
1. Secretary registers client  
2. Draft entry is prepared  
3. Attorney reviews and finalizes  
4. System assigns entry, page, and book numbers  
5. Record is saved in official register  
6. Users can search, export, archive, or restore

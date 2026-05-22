# NRMS Logical Data Structure

Application tables use the `tbl_` prefix through each model's `db_table` setting.

## tbl_user
| Field | Data Type | Length / Precision | Notes |
| --- | --- | --- | --- |
| id | BigAutoField | 64-bit | Primary key |
| password | CharField | 128 | Hashed password |
| last_login | DateTimeField | N/A | Nullable |
| is_superuser | BooleanField | N/A | Django auth |
| username | CharField | 150 | Unique |
| first_name | CharField | 150 | Blank allowed |
| last_name | CharField | 150 | Blank allowed |
| email | EmailField | 254 | Blank allowed |
| is_staff | BooleanField | N/A | Django auth |
| is_active | BooleanField | N/A | Active account flag |
| date_joined | DateTimeField | N/A | Default current time |
| role | CharField | 20 | ADMIN, ATTORNEY, SECRETARY |
| requires_password_change | BooleanField | N/A | First-login password gate |

## tbl_user_groups
| Field | Data Type | Length / Precision | Notes |
| --- | --- | --- | --- |
| id | BigAutoField | 64-bit | Primary key |
| user_id | ForeignKey | 64-bit | References `tbl_user.id` |
| group_id | ForeignKey | 64-bit | References Django `auth_group.id` |

## tbl_user_user_permissions
| Field | Data Type | Length / Precision | Notes |
| --- | --- | --- | --- |
| id | BigAutoField | 64-bit | Primary key |
| user_id | ForeignKey | 64-bit | References `tbl_user.id` |
| permission_id | ForeignKey | 64-bit | References Django `auth_permission.id` |

## tbl_book
| Field | Data Type | Length / Precision | Notes |
| --- | --- | --- | --- |
| id | BigAutoField | 64-bit | Primary key |
| book_number | CharField | 50 | Unique among active books |
| total_pages | IntegerField | N/A | Default 105 |
| appointment_date | DateField | N/A | Nullable |
| expiration_date | DateField | N/A | Nullable |
| created_at | DateTimeField | N/A | Auto-created |
| is_archived | BooleanField | N/A | Archive flag |
| archived_at | DateTimeField | N/A | Nullable |
| archived_by_id | ForeignKey | 64-bit | References `tbl_user.id`, nullable |

## tbl_page
| Field | Data Type | Length / Precision | Notes |
| --- | --- | --- | --- |
| id | BigAutoField | 64-bit | Primary key |
| book_id | ForeignKey | 64-bit | References `tbl_book.id` |
| page_number | IntegerField | N/A | Unique with book |

## tbl_entry
| Field | Data Type | Length / Precision | Notes |
| --- | --- | --- | --- |
| id | BigAutoField | 64-bit | Primary key |
| book_id | ForeignKey | 64-bit | References `tbl_book.id` |
| page_id | ForeignKey | 64-bit | References `tbl_page.id` |
| user_id | ForeignKey | 64-bit | References `tbl_user.id` |
| entry_number | IntegerField | N/A | Unique with active book |
| title | CharField | 255 | Nullable |
| date_time | DateTimeField | N/A | Date/time of notarization |
| notarial_type | CharField | 5 | ACK, SUB, CERT |
| fees | DecimalField | 10,2 | Currency amount |
| or_number | CharField | 50 | Official receipt number |
| remarks | CharField | 3 | CR, NCR |
| is_archived | BooleanField | N/A | Archive flag |
| archived_at | DateTimeField | N/A | Nullable |
| archived_by_id | ForeignKey | 64-bit | References `tbl_user.id`, nullable |
| created_at | DateTimeField | N/A | Auto-created |
| updated_at | DateTimeField | N/A | Auto-updated |

## tbl_client_intake
| Field | Data Type | Length / Precision | Notes |
| --- | --- | --- | --- |
| id | BigAutoField | 64-bit | Primary key |
| queue_number | CharField | 30 | Unique |
| client_name | CharField | 255 | First party display name |
| address | TextField | N/A | First party display address |
| scheduled_date | DateField | N/A | Queue or appointment schedule |
| status | CharField | 20 | PENDING, PROCESSING, COMPLETED, CANCELLED |
| created_by_id | ForeignKey | 64-bit | References `tbl_user.id`, nullable |
| cancelled_by_id | ForeignKey | 64-bit | References `tbl_user.id`, nullable |
| cancel_reason | TextField | N/A | Blank allowed |
| cancelled_at | DateTimeField | N/A | Nullable |
| created_at | DateTimeField | N/A | Auto-created |
| updated_at | DateTimeField | N/A | Auto-updated |

## tbl_client_intake_party
| Field | Data Type | Length / Precision | Notes |
| --- | --- | --- | --- |
| id | BigAutoField | 64-bit | Primary key |
| intake_id | ForeignKey | 64-bit | References `tbl_client_intake.id` |
| name | CharField | 255 | Client or party name |
| address | TextField | N/A | Client or party address |
| id_type | CharField | 100 | Evidence of identity type |
| id_number | CharField | 100 | Evidence of identity number |

## tbl_workflow_draft
| Field | Data Type | Length / Precision | Notes |
| --- | --- | --- | --- |
| id | BigAutoField | 64-bit | Primary key |
| intake_id | OneToOneField | 64-bit | References `tbl_client_intake.id` |
| document_title | CharField | 255 | Blank allowed |
| notarial_type | CharField | 5 | ACK, SUB, CERT |
| notarization_datetime | DateTimeField | N/A | Nullable |
| fees | DecimalField | 10,2 | Nullable |
| or_number | CharField | 50 | Blank allowed |
| remarks | CharField | 3 | CR, NCR |
| witnesses | JSONField | N/A | Witness name/address array |
| status | CharField | 20 | DRAFT, READY, FINALIZED, CANCELLED |
| finalized_entry_id | OneToOneField | 64-bit | References `tbl_entry.id`, nullable |
| created_by_id | ForeignKey | 64-bit | References `tbl_user.id`, nullable |
| updated_by_id | ForeignKey | 64-bit | References `tbl_user.id`, nullable |
| finalized_by_id | ForeignKey | 64-bit | References `tbl_user.id`, nullable |
| created_at | DateTimeField | N/A | Auto-created |
| updated_at | DateTimeField | N/A | Auto-updated |
| finalized_at | DateTimeField | N/A | Nullable |

## tbl_party
| Field | Data Type | Length / Precision | Notes |
| --- | --- | --- | --- |
| id | BigAutoField | 64-bit | Primary key |
| entry_id | ForeignKey | 64-bit | References `tbl_entry.id` |
| name | CharField | 255 | Party name |
| address | TextField | N/A | Party address |

## tbl_witness
| Field | Data Type | Length / Precision | Notes |
| --- | --- | --- | --- |
| id | BigAutoField | 64-bit | Primary key |
| entry_id | ForeignKey | 64-bit | References `tbl_entry.id` |
| name | CharField | 255 | Witness name |
| address | TextField | N/A | Witness address |

## tbl_identity
| Field | Data Type | Length / Precision | Notes |
| --- | --- | --- | --- |
| id | BigAutoField | 64-bit | Primary key |
| party_id | ForeignKey | 64-bit | References `tbl_party.id` |
| id_type | CharField | 100 | Evidence of identity type |
| id_number | CharField | 100 | Evidence of identity number |
| issue_date | DateField | N/A | Nullable |
| expiry_date | DateField | N/A | Nullable |

## tbl_audit_log
| Field | Data Type | Length / Precision | Notes |
| --- | --- | --- | --- |
| id | BigAutoField | 64-bit | Primary key |
| user_id | ForeignKey | 64-bit | References `tbl_user.id`, nullable |
| action | CharField | 20 | CREATE, UPDATE, DELETE, LOGIN, LOGOUT, PASSWORD_CHANGE, REPORT |
| model_name | CharField | 100 | Source model or service |
| object_id | IntegerField | N/A | Nullable |
| timestamp | DateTimeField | N/A | Auto-created |
| description | TextField | N/A | Activity summary |

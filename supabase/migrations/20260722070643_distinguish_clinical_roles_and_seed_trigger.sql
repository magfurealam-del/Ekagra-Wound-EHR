-- Add the distinct clinical roles required by the EHR specification.
alter type identity.user_role add value if not exists 'medical_officer';
alter type identity.user_role add value if not exists 'consultant';
